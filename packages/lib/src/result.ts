export type Result<Value, Error = undefined> = 
  | { success: true; value: Value, error?: undefined }
  | { success: false; value?: undefined, error: Error }
  
export const Result = {
  Ok<V, E = null>(value: V): Result<V, E> {
    return { success: true, value }
  },
  Err<V, E>(error: E): Result<V, E> {
    return { success: false, error }
  }
}
