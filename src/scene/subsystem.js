const NOOP = () => undefined;

function asHook(source, name) {
  return typeof source?.[name] === "function" ? source[name].bind(source) : NOOP;
}

export function normalizeSceneSubsystem(source = {}) {
  const subsystem = source && typeof source === "object" ? source : {};
  return {
    ...subsystem,
    applyQuality: asHook(subsystem, "applyQuality"),
    dispose: asHook(subsystem, "dispose"),
    resize: asHook(subsystem, "resize"),
    update: asHook(subsystem, "update"),
  };
}

export function runSceneInitialization(registry, initialize) {
  try {
    return initialize();
  } catch (error) {
    try {
      registry.dispose();
    } catch {
      // Preserve the initialization failure; cleanup is best-effort here.
    }
    throw error;
  }
}

export function createSceneSubsystemRegistry(initialSubsystems = []) {
  const orderedSubsystems = [];
  const subsystems = [];
  let disposed = false;

  function register(source) {
    if (disposed) {
      throw new Error("Cannot register a scene subsystem after disposal.");
    }
    const subsystem = normalizeSceneSubsystem(source);
    subsystems.push(subsystem);
    orderedSubsystems.push(subsystem);
    orderedSubsystems.sort(
      (left, right) => (left.lifecycleOrder || 0) - (right.lifecycleOrder || 0),
    );
    return subsystem;
  }

  initialSubsystems.forEach(register);

  function invoke(name, ...args) {
    if (disposed) return false;
    for (const subsystem of orderedSubsystems) subsystem[name](...args);
    return true;
  }

  return {
    applyQuality(...args) {
      return invoke("applyQuality", ...args);
    },
    dispose() {
      if (disposed) return false;
      disposed = true;
      let firstError = null;
      for (let index = subsystems.length - 1; index >= 0; index -= 1) {
        try {
          subsystems[index].dispose();
        } catch (error) {
          firstError ||= error;
        }
      }
      subsystems.length = 0;
      orderedSubsystems.length = 0;
      if (firstError) throw firstError;
      return true;
    },
    get disposed() {
      return disposed;
    },
    get size() {
      return subsystems.length;
    },
    register,
    resize(...args) {
      return invoke("resize", ...args);
    },
    update(...args) {
      return invoke("update", ...args);
    },
  };
}
