import { parseStructTag } from '@mysten/sui/utils';

export const standardShortCoinType = (hexString: string) => {
  return '0x' + hexString.replace('0x', '').replace(/^0+/, '');
};

const stripZeros = function (a: string): string {
  let first = a[0];
  while (a.length > 0 && first.toString() === '0') {
    a = a.slice(1);
    first = a[0];
  }
  return a;
};

export function shortedCoinType(type: any): string {
  const { address, module, name, typeParams } =
    typeof type === 'string' ? parseStructTag(type) : type;

  const formattedTypeParams =
    typeParams?.length > 0
      ? `<${typeParams
          .map((typeParam: any) =>
            typeof typeParam === 'string'
              ? typeParam
              : shortedCoinType(typeParam)
          )
          .join(',')}>`
      : '';

  return `0x${stripZeros(
    address.replace('0x', '')
  )}::${module}::${name}${formattedTypeParams}`;
}
