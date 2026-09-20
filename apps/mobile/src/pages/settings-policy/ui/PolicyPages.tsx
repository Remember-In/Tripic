import {
  locationInformationDocument,
  mapDataDocument,
  photoMetadataDocument,
  privacyPolicyDocument,
  termsOfServiceDocument,
} from "../model/policyDocuments";
import { SettingsPolicyPage } from "./SettingsPolicyPage";

export function PrivacyPolicyPage() {
  return <SettingsPolicyPage document={privacyPolicyDocument} />;
}

export function TermsOfServicePage() {
  return <SettingsPolicyPage document={termsOfServiceDocument} />;
}

export function LocationInformationPage() {
  return <SettingsPolicyPage document={locationInformationDocument} />;
}

export function PhotoMetadataPage() {
  return <SettingsPolicyPage document={photoMetadataDocument} />;
}

export function MapDataPage() {
  return <SettingsPolicyPage document={mapDataDocument} />;
}
