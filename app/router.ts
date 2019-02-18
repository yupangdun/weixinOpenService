import { Application } from 'egg';

export default (app: Application) => {
  const { controller, router } = app;

  // 第三方回调地址 获取加密ticket
  router.post('/wxopen', controller.wxOpen.setComponentVerifyTicket);

  // 解密 ticket
  router.get('/wxopen/getTickt', controller.wxOpen.getTickt);

  // 测试 ticket 换取 accesstoken
  router.get('/wxopen/getAccessToken', controller.wxOpen.getComponentAccessToken);

  // 测试 accesstoken 获取 预授权码
  router.get('/wxopen/getPreAuthCode', controller.wxOpen.getPreAuthCode);

  router.post('/wxopen/:appid/callback', controller.wxOpen.postMessage);

  router.get('/test', controller.wxOpen.testRedis);
};
