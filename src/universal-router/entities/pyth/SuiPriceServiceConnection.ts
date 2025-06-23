import { Buffer } from 'buffer';
import invariant from 'tiny-invariant';
import JsonBigInt from '../../utils/JsonBigInt';

export class SuiPriceServiceConnection {
  private readonly _endpoint: string;
  private readonly _timeout: number;

  constructor(endpoint: string, config?: { timeout: number }) {
    this._endpoint = endpoint;
    this._timeout = config?.timeout ?? 30000;
  }
  /**
   * Gets price update data (either batch price attestation VAAs or accumulator messages, depending on the chosen endpoint), which then
   * can be submitted to the Pyth contract to update the prices. This will throw an axios error if there is a network problem or
   * the price service returns a non-ok response (e.g: Invalid price ids)
   *
   * @param priceIds Array of hex-encoded price ids.
   * @returns Array of buffers containing the price update data.
   */
  async getPriceFeedsUpdateData(priceIds: string[]): Promise<Buffer[]> {
    // Fetch the latest price feed update VAAs from the price service
    const queryParams = priceIds
      .map((priceId) => `ids[]=${encodeURIComponent(priceId)}`)
      .join('&');

    const response = await fetch(
      `${this._endpoint}/updates/price/latest?` + queryParams,
      {
        signal: AbortSignal.timeout(this._timeout),
        keepalive: true,
      }
    );
    const rawResponse = await response.text();
    invariant(response.ok, rawResponse);

    const parsedResponse: { binary: { encoding: string; data: string[] } } =
      JsonBigInt.parse(rawResponse);
    const { data: latestVaas, encoding } = parsedResponse.binary;

    return latestVaas.map((latestVaa) =>
      Buffer.from(latestVaa, encoding as BufferEncoding)
    );
  }
}
