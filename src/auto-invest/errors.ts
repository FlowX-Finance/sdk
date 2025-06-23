export class MissingImplementation extends Error {
  constructor(key: string) {
    super(`Missing implementation for ${key}`);
    Object.setPrototypeOf(this, MissingImplementation.prototype);
  }
}

export class MissingConfiguration extends Error {
  constructor(key: string, value: string) {
    super(`Missing configuration for ${key}: ${value}`);
    Object.setPrototypeOf(this, MissingConfiguration.prototype);
  }
}
