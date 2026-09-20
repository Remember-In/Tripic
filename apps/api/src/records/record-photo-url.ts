/**
 * 사진 바이너리 서빙 경로 (docs/11 §3.1).
 *
 * 업로드 201 응답·상세 응답·목록의 대표 사진이 모두 이 한 곳을 쓴다.
 * 사본이 생기면 서빙 라우트를 바꿀 때 일부만 따라가, 저장해둔 URL 이 404 가 된다.
 */
export const recordPhotoUrl = (
  recordId: string,
  date: string,
  photoId: string,
): string => `/records/${recordId}/days/${date}/photos/${photoId}`;
