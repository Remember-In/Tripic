import type {
  CreateRecordInput,
  RecordDetail,
  RecordPhoto,
  RecordSummary,
  UpdateRecordInput,
  UpsertEntryInput,
} from "@tripic/shared";

import { requestJson } from "@/shared/api/http";

export function listRecords() {
  return requestJson<RecordSummary[]>("/records", { auth: true });
}

export function getRecord(recordId: string) {
  return requestJson<RecordDetail>(`/records/${recordId}`, { auth: true });
}

export function createRecord(input: CreateRecordInput) {
  return requestJson<RecordSummary>("/records", {
    auth: true,
    body: JSON.stringify(input),
    method: "POST",
  });
}

export function updateRecord(recordId: string, input: UpdateRecordInput) {
  return requestJson<RecordSummary>(`/records/${recordId}`, {
    auth: true,
    body: JSON.stringify(input),
    method: "PATCH",
  });
}

export function upsertRecordEntry(
  recordId: string,
  date: string,
  input: UpsertEntryInput,
) {
  return requestJson(`/records/${recordId}/days/${date}/entry`, {
    auth: true,
    body: JSON.stringify(input),
    method: "PUT",
  });
}

export function deleteRecordEntry(recordId: string, date: string) {
  return requestJson<void>(`/records/${recordId}/days/${date}/entry`, {
    auth: true,
    method: "DELETE",
  });
}

export function uploadRecordPhoto(recordId: string, date: string, photo: Blob) {
  const formData = new FormData();
  formData.set("photo", photo, "tripic-photo.jpg");
  return requestJson<RecordPhoto>(`/records/${recordId}/days/${date}/photos`, {
    auth: true,
    body: formData,
    method: "POST",
  });
}

export function deleteRecord(recordId: string) {
  return requestJson<void>(`/records/${recordId}`, {
    auth: true,
    method: "DELETE",
  });
}

export function clearRecords() {
  return requestJson<void>("/records", { auth: true, method: "DELETE" });
}
