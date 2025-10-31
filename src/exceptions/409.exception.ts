export class ConflictException extends Error {
  status = 409;
  error = 'Conflict';
  constructor(public message: string) {
    super(message);
  }
}
