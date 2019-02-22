// This file is created by egg-ts-helper
// Do not modify this file!!!!!!!!!

import 'egg';
import ExportWxopen from '../../../app/model/wxopen';

declare module 'egg' {
  interface IModel {
    Wxopen: ReturnType<typeof ExportWxopen>;
  }
}
