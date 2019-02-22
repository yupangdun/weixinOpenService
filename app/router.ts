import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;

  // 第三方回调地址 获取加密ticket
  router.post('/wxopen', controller.wxopen.setComponentVerifyTicket);

  // 测试 ticket 换取 accesstoken
  router.get('/wxopen/getAccessToken', controller.wxopen.getComponentAccessToken);

  // 测试 accesstoken 获取 预授权码
  router.get('/wxopen/getPreAuthCode', controller.wxopen.getPreAuthCode);

  router.post('/wxopen/:appid/callback', controller.wxopen.postEventMessage);

  router.get('/test', controller.wxopen.testRedis);
};
