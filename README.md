# 微信第三放开放平台发布验证

Node.js版本微信第三放开放平台发布验证，使用egg+redis组合

## QuickStart

### Development

1.setting: `config/index.ts`

2.bash run:
```bash
$ npm i
$ npm run dev
$ open http://localhost:80/
```

Don't tsc compile at development mode, if you had run `tsc` then you need to `npm run clean` before `npm run dev`.

### Deploy
1. install & run redis-server (prot:6379)
2. install & run mysql (prot:3306)
3. install node
4. bash:
```bash
$ npm i 
$ npm run tsc
$ npm start
```

### Npm Scripts

- Use `npm run lint` to check code style
- Use `npm test` to run unit test
- se `npm run clean` to clean compiled js at development mode once

### Requirement

- Node.js 8.x
- Typescript 2.8+
