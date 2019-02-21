
/**
 * 生成QRCode请求参数模型
 *
 * @export
 * @interface QRCodeQuery
 */
export interface QRCodeQuery {
  expire_seconds?: number;
  action_name?: actionName;
  scene?: string | number;
}

/**
 * 生成QRCode请求微信body
 *
 * @export
 * @interface CreateQRCodeBody
 */
export interface CreateQRCodeBody {
  expire_seconds?: number;
  action_name: string;
  action_info: ActionInfo;
}

interface ActionInfo {
  scene: Scene;
}

interface Scene {
  scene_id?: number;
  scene_str?: string;
}

export enum actionName {
  QR_SCENE = 'QR_SCENE', // 临时的整型参数值
  QR_STR_SCENE = 'QR_STR_SCENE', // 临时的字符串参数值
  QR_LIMIT_SCENE = 'QR_LIMIT_SCENE', // 永久的整型参数值
  QR_LIMIT_STR_SCENE = 'QR_LIMIT_STR_SCENE', // 永久的字符串参数值
}
