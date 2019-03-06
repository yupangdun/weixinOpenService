import 'egg';

declare module 'egg' {
  interface mysql {
    get(tableName: String, find: {}): Promise<Any>
    insert(tableName: String, find: {}): Promise<Any>
    query(sql: String, values: Any[]): Promise<Any>
  }
  interface Application {
    mysql: mysql;
  }
}