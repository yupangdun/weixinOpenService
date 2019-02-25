import axios from 'axios';
import { Service } from 'egg';
import config from '../config';
import { EventKey, messageConfigs } from '../config/message';
import { ActionName, CreateQRCodeBody, EventType, QRCodeQuery } from '../model/wxopen';

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

  public async postCreateQRCode(query: QRCodeQuery, isUrl: boolean = true) {
    let body: CreateQRCodeBody;
    switch (query.action_name) {
      case ActionName.QR_SCENE:
        body = {
          expire_seconds: query.expire_seconds || 60,
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_id: query.scene as number },
          },
        }; break;
      case ActionName.QR_STR_SCENE:
        body = {
          expire_seconds: query.expire_seconds || 60,
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_str: query.scene as string },
          },
        }; break;
      case ActionName.QR_LIMIT_SCENE:
        body = {
          action_name: query.action_name,
          action_info:
          {
            scene: { scene_id: query.scene as number },
          },
        }; break;
      case ActionName.QR_LIMIT_STR_SCENE:
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
          action_name: ActionName.QR_SCENE,
          action_info: {
            scene: {
              scene_id: 1,
            },
          },
        };
    }
    const authorizerAccessToken = await this.getAuthorizerAccessToken();
    const res = await axios.post(`${config.api_create_qrcode_url}?access_token=${authorizerAccessToken}`, body);
    if (isUrl) {
      return res.data;
    } else {
      const response = await axios.get(`${config.api_show_qrcode_url}?ticket=${encodeURI(res.data.ticket)}`);
      this.ctx.response.set('Content-Type', response.headers['content-type']);
      return response.data;
    }
  }

  public async postEventMessage(request: any) {
    const timeStamp = new Date().getTime();
    if (request.MsgType === 'text' && request.Content === 'TESTCOMPONENT_MSG_TYPE_TEXT') {

      /**
       * 1、模拟粉丝发送文本消息给专用测试公众号，第三方平台方需根据文本消息的内容进行相应的响应：
       *
       * 1）微信模推送给第三方平台方：文本消息，其中Content字段的内容固定为：TESTCOMPONENT_MSG_TYPE_TEXT
       *
       *  2）第三方平台方立马回应文本消息并最终触达粉丝：Content必须固定为：TESTCOMPONENT_MSG_TYPE_TEXT_callback
       */

      // tslint:disable-next-line:max-line-length
      return `<xml><ToUserName><![CDATA[${request.FromUserName}]]></ToUserName><FromUserName><![CDATA[${request.ToUserName}]]></FromUserName><CreateTime>${timeStamp}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[TESTCOMPONENT_MSG_TYPE_TEXT_callback]]></Content><MsgId>${request.MsgId}</MsgId></xml>`;
    } else if (request.MsgType === 'text' && request.Content.indexOf('QUERY_AUTH_CODE:') > -1) {

      /**
       * 2、模拟粉丝发送文本消息给专用测试公众号，第三方平台方需在5秒内返回空串表明暂时不回复，然后再立即使用客服消息接口发送消息回复粉丝
       *
       * 1）微信模推送给第三方平台方：文本消息，其中Content字段的内容固定为： QUERY_AUTH_CODE:$query_auth_code$（query_auth_code
       * 会在专用测试公众号自动授权给第三方平台方时，由微信后台推送给开发者）
       *
       * 2）第三方平台方拿到$query_auth_code$的值后，通过接口文档页中的“使用授权码换取公众号的授权信息”API，将$query_auth_code$的值赋值
       * 给API所需的参数authorization_code。然后，调用发送客服消息api回复文本消息给粉丝，其中文本消息的content字段设为：$query_auth_code$_from_api
       * （其中$query_auth_code$需要替换成推送过来的query_auth_code）
       */

      this.ctx.body = '';
      const queryAuthCode = request.Content.replace('QUERY_AUTH_CODE:', '');
      await this.postApiQueryAuth(queryAuthCode);
      await this.postSendCustomMessage({
        touser: request.FromUserName,
        msgtype: 'text',
        text: {
          content: `${queryAuthCode}_from_api`,
        },
      });
      return;
    } else if (request.Event === EventType.scan || request.Event === EventType.subscribe) {
      // 返回一条图文消息
      switch (request.EventKey.toString()) {
        case EventKey.GEZHIXUAN.toString():
          const messageConfig = messageConfigs[EventKey.GEZHIXUAN - 1];
          // tslint:disable-next-line:max-line-length
          return `<xml><ToUserName><![CDATA[${request.FromUserName}]]></ToUserName><FromUserName><![CDATA[${request.ToUserName}]]></FromUserName><CreateTime>${timeStamp}</CreateTime><MsgType><![CDATA[${messageConfig.MsgType}]]></MsgType><ArticleCount>${messageConfig.ArticleCount}</ArticleCount><Articles><item><Title><![CDATA[${messageConfig.Title}]]></Title><Description><![CDATA[${messageConfig.Description}]]></Description><PicUrl><![CDATA[${messageConfig.PicUrl}]]></PicUrl><Url><![CDATA[${messageConfig.Url}]]></Url></item></Articles></xml>`;
        default: return;
      }
    } else {
      return;
      // tslint:disable-next-line:max-line-length
      // str = `<xml><ToUserName><![CDATA[${res.xml.FromUserName}]]></ToUserName><FromUserName><![CDATA[${res.xml.ToUserName}]]></FromUserName><CreateTime>${timeStamp}</CreateTime><MsgType><![CDATA[text]]></MsgType><Content><![CDATA[微信第三方开发平台：${res.xml.Content}]]></Content><MsgId>${res.xml.MsgId}</MsgId></xml>`;
    }
  }
}
