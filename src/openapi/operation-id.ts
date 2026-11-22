const lowerFirst = (value: string): string =>
  value.charAt(0).toLowerCase() + value.slice(1);

const upperFirst = (value: string): string =>
  value.charAt(0).toUpperCase() + value.slice(1);

export const operationIdFactory = (
  controllerKey: string,
  methodKey: string,
): string =>
  lowerFirst(controllerKey.replace(/Controller$/, '')) + upperFirst(methodKey);
