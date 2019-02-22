import axios from 'axios';
import { Service } from 'egg';
import config from '../config';
import { QRCodeQuery, CreateQRCodeBody, actionName } from '../model/wxopen';


export default class WxOpenService extends Service {

  /**
   * 每10分钟保存微信传过来的ticket
   *
   * @param {string} componentVerifyTicket
   * @memberof WxOpenService
   */
  public async setComponentVerifyTicket(componentVerifyTicket: string) {
    const { app } = this;
    await app.myRedis.set('ComponentVerifyTicket', componentVerifyTicket);
  }

  /**
   * 获取 ComponentAccessToken
   *
   * @returns {Promise<string>}
   * @memberof WxOpenService
   */
  public async getComponentAccessToken(): Promise<string> {
    const { app } = this;
    let componentAccessToken = await app.myRedis.get('ComponentAccessToken');
    if (!componentAccessToken) {
      const ticket = await app.myRedis.get('ComponentVerifyTicket');
      const res: any = await axios.post(config.api_component_token_url, {
        component_appid: config.appid,
        component_appsecret: config.appsecret,
        component_verify_ticket: ticket,
      });
      await app.myRedis.set('ComponentAccessToken', res.data.component_access_token, res.data.expires_in - 600);
      componentAccessToken = res.data.component_access_token;
    }
    return componentAccessToken;
  }

  /**
   * 获取预授权码
   *
   * @returns {Promise<string>}
   * @memberof WxOpenService
   */
  public async postCreatePreauthcode(): Promise<string> {
    const componentAccessToken = await this.getComponentAccessToken();
    const url = `${config.api_create_preauthcode_url}?component_access_token=${componentAccessToken}`;
    const res = await axios.post(url, {
      component_appid: config.appid,
    });
    if (res.data.pre_auth_code) {
      return res.data.pre_auth_code;
    } else {
      return res.data;
    }
  }

  /**
   *  授权码换取 authorizer_access_token
   *
   * @memberof WxOpenService
   */
  public async postApiQueryAuth(authorizationCode: string) {
    const { app } = this;
    const componentAccessToken = await this.getComponentAccessToken();
    const res = await axios.post(`${config.api_query_auth_url}?component_access_token=${componentAccessToken}`, {
      component_appid: config.appid,
      authorization_code: authorizationCode,
    });

    const {
      authorizer_appid,
      authorizer_access_token,
      authorizer_refresh_token,
      expires_in,
    } = res.data.authorization_info;
    await app.myRedis.set('AuthorizerAppid', authorizer_appid);
    await app.myRedis.set('AuthorizerAccessToken', authorizer_access_token, expires_in - 600);
    await app.myRedis.set('AuthorizerRefreshToken', authorizer_refresh_token);

    return res.data;
  }

  /**
   * 获取客户方 authorizer_access_token
   *
   * @returns
   * @memberof WxOpenService
   */
  public async getAuthorizerAccessToken() {
    const { app } = this;
    let authorizerAccessToken = await app.myRedis.get('AuthorizerAccessToken');
    if (!authorizerAccessToken) {
      const componentAccessToken = await this.getComponentAccessToken();
      const authorizerAppid = await app.myRedis.get('AuthorizerAppid');
      const authorizerRefreshToken = await app.myRedis.get('AuthorizerRefreshToken');

      const res = await axios.post(
        `${config.api_authorizer_token_url}?component_access_token=${componentAccessToken}`,
        {
          component_appid: config.appid,
          authorizer_appid: authorizerAppid,
          authorizer_refresh_token: authorizerRefreshToken,
        });
      if (res.data.authorizer_access_token) {
        const { authorizer_access_token, authorizer_refresh_token, expires_in } = res.data;
        await app.myRedis.set('AuthorizerAccessToken', authorizer_access_token, expires_in - 600);
        await app.myRedis.set('AuthorizerRefreshToken', authorizer_refresh_token);
        authorizerAccessToken = authorizer_access_token;
      }
    }
    return authorizerAccessToken;
  }

  /**
   * 发送客服消息
   *
   * @param {*} body 消息体
   * @returns
   * @memberof WxOpenService
   */
  public async postSendCustomMessage(body: any) {
    const authorizerAccessToken = await this.getAuthorizerAccessToken();
    return await axios.post(`${config.api_send_custom_message_url}?access_token=${authorizerAccessToken}`, body);
  }

  public async postCreateQRCode(query: QRCodeQuery) {
    let body: CreateQRCodeBody;
    switch (query.action_name) {
      case actionName.QR_SCENE:
        body = {
          expire_seconds: query.expire_seconds || 60,
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_id: query.scene as number },
          },
        }; break;
      case actionName.QR_STR_SCENE:
        body = {
          expire_seconds: query.expire_seconds || 60,
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_str: query.scene as string },
          },
        }; break;
      case actionName.QR_LIMIT_SCENE:
        body = {
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_id: query.scene as number },
          },
        }; break;
      case actionName.QR_LIMIT_STR_SCENE:
        body = {
          expire_seconds: query.expire_seconds || 60,
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_str: query.scene as string },
          },
        }; break;
      default:
        body = {
          action_name: actionName.QR_SCENE,
          action_info: {
            scene: {
              scene_id: 1,
            },
          },
        };
    }
    const authorizerAccessToken = await this.getAuthorizerAccessToken();
    return await axios.post(`${config.api_create_qrcode_url}?access_token=${authorizerAccessToken}`, body);

  }
}
