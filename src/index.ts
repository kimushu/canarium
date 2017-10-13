import * as modCanariumGen1 from './gen1/canarium';
import * as modCanariumGen2 from './gen2/canarium';

/*
 * Gen1インターフェース (CanariumおよびCanariumGen1として)
 */
export const Canarium = modCanariumGen1.Canarium;
export type Canarium = modCanariumGen1.Canarium;
export const CanariumGen1 = modCanariumGen1.Canarium;
export type CanariumGen1 = modCanariumGen1.Canarium;

/*
 * Gen2インターフェース (CanariumGen2として)
 * [内包するクラスは型情報のみをエクスポート]
 */
export const CanariumGen2 = modCanariumGen2.CanariumGen2;
export type CanariumGen2 = modCanariumGen2.CanariumGen2;

export module CanariumGen2 {
    export type BoardInfo = modCanariumGen2.CanariumGen2.BoardInfo;
    export type PortInfo = modCanariumGen2.CanariumGen2.PortInfo;
    export type OpenOptions = modCanariumGen2.CanariumGen2.OpenOptions;
    export type ListOptions = modCanariumGen2.CanariumGen2.ListOptions;
    export type StreamOptions = modCanariumGen2.CanariumGen2.StreamOptions;
    export type RpcClient = modCanariumGen2.CanariumGen2.RpcClient;
    export type RpcError = modCanariumGen2.CanariumGen2.RpcError;
    export type AvsWritableStream = modCanariumGen2.CanariumGen2.AvsWritableStream;
    export type AvsReadableStream = modCanariumGen2.CanariumGen2.AvsReadableStream;
}
