const API_ROOT = "https://api.cloudflare.com/client/v4";
const LIST_NAME = "alexnava_pages_hostname_redirects";
const RULE_REF = "canonicalize_alexnava_pages_hostname";
const SOURCE_URL = "https://alexnava-me.pages.dev/";
const TARGET_URL = "https://alexnava.me/";
const CHECK_PATH = "__babel-canonical-check?source=cloudflare-workflow&keep=1";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const apiToken = process.env.CLOUDFLARE_API_TOKEN;

if (!accountId || !apiToken) {
  throw new Error(
    "CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN are required. Configure the protected production environment before retrying.",
  );
}

async function cloudflare(path, { method = "GET", body } = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Cloudflare API returned a non-JSON response for ${method} ${path}.`);
  }

  if (!response.ok || payload.success !== true) {
    const details = (payload.errors ?? [])
      .map(({ code, message }) => `${code ?? "unknown"}: ${message ?? "unknown error"}`)
      .join("; ");
    throw new Error(
      `Cloudflare API rejected ${method} ${path}${details ? ` (${details})` : ""}. ` +
        "The token needs Account Filter Lists Edit and Bulk URL Redirects Edit for this account.",
    );
  }

  return payload.result;
}

async function waitForBulkOperation(operationId) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const operation = await cloudflare(
      `/accounts/${accountId}/rules/lists/bulk_operations/${operationId}`,
    );
    if (operation.status === "completed") return;
    if (operation.status === "failed") {
      throw new Error(`Cloudflare bulk operation failed: ${operation.error ?? "unknown error"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  throw new Error("Timed out waiting for the Cloudflare redirect-list operation.");
}

function redirectMatches(item) {
  const redirect = item?.redirect;
  return (
    redirect?.source_url === SOURCE_URL &&
    redirect?.target_url === TARGET_URL &&
    redirect?.status_code === 301 &&
    redirect?.include_subdomains === false &&
    redirect?.subpath_matching === true &&
    redirect?.preserve_path_suffix === true &&
    redirect?.preserve_query_string === true
  );
}

const lists = await cloudflare(`/accounts/${accountId}/rules/lists?per_page=100`);
const matchingLists = lists.filter(({ name }) => name === LIST_NAME);
if (matchingLists.length > 1) {
  throw new Error(`Refusing to continue: multiple Cloudflare lists are named ${LIST_NAME}.`);
}

let redirectList = matchingLists[0];
if (!redirectList) {
  redirectList = await cloudflare(`/accounts/${accountId}/rules/lists`, {
    method: "POST",
    body: {
      name: LIST_NAME,
      description: "Canonicalize the production Pages hostname to alexnava.me.",
      kind: "redirect",
    },
  });
  console.log("Created the dedicated canonical-host redirect list.");
} else if (redirectList.kind !== "redirect") {
  throw new Error(`Refusing to modify ${LIST_NAME}: the existing list is not a redirect list.`);
}

const listItems = await cloudflare(
  `/accounts/${accountId}/rules/lists/${redirectList.id}/items?per_page=500`,
);
if (listItems.length === 0) {
  const operation = await cloudflare(
    `/accounts/${accountId}/rules/lists/${redirectList.id}/items`,
    {
      method: "POST",
      body: [
        {
          redirect: {
            source_url: SOURCE_URL,
            target_url: TARGET_URL,
            status_code: 301,
            include_subdomains: false,
            subpath_matching: true,
            preserve_path_suffix: true,
            preserve_query_string: true,
          },
          comment: "Exact production Pages hostname to canonical apex",
        },
      ],
    },
  );
  await waitForBulkOperation(operation.operation_id);
  console.log("Added the exact-host redirect entry.");
} else if (listItems.length !== 1 || !redirectMatches(listItems[0])) {
  throw new Error(
    `Refusing to overwrite unexpected entries in the dedicated ${LIST_NAME} redirect list.`,
  );
}

const desiredRule = {
  ref: RULE_REF,
  expression: `http.request.full_uri in $${LIST_NAME}`,
  description: "Canonicalize alexnava-me.pages.dev to alexnava.me.",
  action: "redirect",
  action_parameters: {
    from_list: {
      name: LIST_NAME,
      key: "http.request.full_uri",
    },
  },
  enabled: true,
};

const rulesets = await cloudflare(`/accounts/${accountId}/rulesets?per_page=50`);
const redirectRulesets = rulesets.filter(
  ({ kind, phase }) => kind === "root" && phase === "http_request_redirect",
);
if (redirectRulesets.length > 1) {
  throw new Error("Refusing to continue: multiple account redirect entry-point rulesets exist.");
}

if (redirectRulesets.length === 0) {
  await cloudflare(`/accounts/${accountId}/rulesets`, {
    method: "POST",
    body: {
      name: "Canonical hostname redirects",
      description: "Account entry point for intentionally managed canonical redirects.",
      kind: "root",
      phase: "http_request_redirect",
      rules: [desiredRule],
    },
  });
  console.log("Created the account redirect entry point and enabled the canonical rule.");
} else {
  const ruleset = await cloudflare(`/accounts/${accountId}/rulesets/${redirectRulesets[0].id}`);
  const matchingRules = (ruleset.rules ?? []).filter(({ ref }) => ref === RULE_REF);
  const listRules = (ruleset.rules ?? []).filter(
    (rule) => rule.action_parameters?.from_list?.name === LIST_NAME,
  );

  if (matchingRules.length > 1 || listRules.some(({ ref }) => ref !== RULE_REF)) {
    throw new Error("Refusing to continue: conflicting rules already reference the redirect list.");
  }

  if (matchingRules.length === 0) {
    await cloudflare(`/accounts/${accountId}/rulesets/${ruleset.id}/rules`, {
      method: "POST",
      body: desiredRule,
    });
    console.log("Enabled the canonical redirect list in the existing account ruleset.");
  } else {
    await cloudflare(`/accounts/${accountId}/rulesets/${ruleset.id}/rules/${matchingRules[0].id}`, {
      method: "PATCH",
      body: desiredRule,
    });
    console.log("Reconciled the existing canonical redirect rule.");
  }
}

const expectedLocation = `${TARGET_URL}${CHECK_PATH}`;
for (let attempt = 0; attempt < 18; attempt += 1) {
  const response = await fetch(`${SOURCE_URL}${CHECK_PATH}`, {
    redirect: "manual",
    headers: { "User-Agent": "babel-cloudflare-canonical-check" },
  });
  if (response.status === 301 && response.headers.get("location") === expectedLocation) {
    console.log("Verified exact-host 301 with path and query preservation.");
    process.exit(0);
  }
  await new Promise((resolve) => setTimeout(resolve, 5000));
}

throw new Error("The canonical redirect did not propagate within the verification window.");
