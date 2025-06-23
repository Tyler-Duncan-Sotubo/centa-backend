interface error {
  message: string;
}

export interface HttpExceptionResponse {
  error: error;
}

export interface CustomHttpExceptionResponse extends HttpExceptionResponse {
  status: string;
}
