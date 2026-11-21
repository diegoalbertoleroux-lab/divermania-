export class OperationError extends Error {
  constructor(code,message){super(message);this.name='OperationError';this.code=code;}
}
