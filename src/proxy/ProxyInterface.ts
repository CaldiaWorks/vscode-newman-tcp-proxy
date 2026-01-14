export interface ProxyEvent {
  id: string;
  timestamp: number;
  type: "connection" | "data" | "error" | "close";
  source: "client" | "target";
  data?: Buffer | string;
  info?: string;
}

export interface IProxyLogger {
  log(event: ProxyEvent): void;
}
