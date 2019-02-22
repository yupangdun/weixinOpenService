import { Controller } from 'egg';

// http://wxopen.imprexion.cn/wxopen?signature=879da4b1b2614c1143d8b8dc871b44dc14fc17cb&
// timestamp=1550050048&nonce=632107448&encrypt_type=aes&
// msg_signature=e512c3417e53623fd684d12fc29a871552f42af0

export default class WxOpenController extends Controller {

    /**
     * 获取第三方加密 component_verify_ticket 微信服务器每10分钟回调一次
     * 将最新的ticket存放进redis中
     *
     * @memberof WxOpenController
     */
    public async setComponentVerifyTicket() {
        const { app, ctx } = this;
        const res = await app.xml2json(ctx);

        if (res.xml.ComponentVerifyTicket) {
            // 每十分钟的微信回调ticket
            await ctx.service.wxopen.setComponentVerifyTicket(res.xml.ComponentVerifyTicket);
        } else if (res.xml.InfoType) {
            switch (res.xml.InfoType) {
                case 'authorized':
                    // 授权成功
                    await ctx.service.wxopen.postApiQueryAuth(res.xml.AuthorizationCode);
                    break;
                case 'unauthorized':
                    // 取消授权
                    break;
                case 'updateauthorized':
                    // 更新授权
                    await ctx.service.wxopen.postApiQueryAuth(res.xml.AuthorizationCode);
                    break;
                default: break;
            }

        }
        ctx.body = 'success';
    }

    /**
     * 将 component_verify_ticket 换成 component_access_token
     *
     * @memberof WxOpenController
     */
    public async getComponentAccessToken() {
        const { ctx } = this;
        ctx.body = await ctx.service.wxopen.getComponentAccessToken();
    }

    /**
     *  获取预授权码
     *
     * @memberof WxOpenController
     */
    public async getPreAuthCode() {
        const { ctx } = this;
        ctx.body = await ctx.service.wxopen.postCreatePreauthcode();
    }

    public async postEventMessage() {
        const { app, ctx } = this;
        const request = await app.xml2json(ctx);
        ctx.response.set('Content-Type', 'text/xml');
        const response = await ctx.service.wxopen.postEventMessage(request.xml);
        ctx.body = response && ctx.service.aes.encrypt(response);
    }

    public async createQRCodeImage() {
        const { ctx } = this;
        ctx.body = await ctx.service.wxopen.postCreateQRCode(ctx.request.query, false);
    }

    public async createQRCodeUrl() {
        const { ctx } = this;
        ctx.body = await ctx.service.wxopen.postCreateQRCode(ctx.request.query);
    }

    public async testRedis() {
        const { ctx, app } = this;
        await app.myRedis.set('test', 'redis is ok!');
        const res = await app.myRedis.get('test');
        ctx.body = res;
    }
}
