import type { ImagePickerAsset } from "expo-image-picker";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { TravelRecord } from "@/entities/travel-record";

import { placeFixtures } from "./fixtures";
import { createDraftPhoto } from "./photoMetadata";
import type {
  DraftPhoto,
  DraftVisit,
  RecordTripTheme,
  RecordVoiceTheme,
} from "./types";

type CreateRecordSessionValue = {
  addPhotosFromLibrary: (assets: ImagePickerAsset[]) => void;
  completedRecord?: TravelRecord;
  getPhotoDetails: (photoId: string) => PhotoDetails;
  photoDate: string;
  photoPlace: string;
  photos: DraftPhoto[];
  removePhoto: (photoId: string) => void;
  resetDraft: () => void;
  selectPhotoForInfo: (photoId: string) => void;
  selectedPhoto?: DraftPhoto;
  setCompletedRecord: (record: TravelRecord) => void;
  setPhotoDate: (date: string) => void;
  setPhotoPlace: (place: string) => void;
  setTripTheme: (theme: RecordTripTheme) => void;
  setVoiceTheme: (theme: RecordVoiceTheme) => void;
  tripTheme: RecordTripTheme;
  visits: DraftVisit[];
  voiceTheme: RecordVoiceTheme;
};

type PhotoDetails = {
  date: string;
  place: string;
};

const today = new Date();
const fallbackPhotoDetails: PhotoDetails = {
  date: [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-"),
  place: "경주월드",
};

function initialPhotoDetails(photo?: DraftPhoto): PhotoDetails {
  return {
    ...fallbackPhotoDetails,
    date: photo?.takenDate ?? fallbackPhotoDetails.date,
  };
}

const CreateRecordSessionContext =
  createContext<CreateRecordSessionValue | null>(null);

export function CreateRecordSessionProvider({ children }: PropsWithChildren) {
  const [photos, setPhotos] = useState<DraftPhoto[]>([]);
  const [photoDetails, setPhotoDetails] = useState<
    Record<string, PhotoDetails>
  >({});
  const [completedRecord, setCompletedRecord] = useState<TravelRecord>();
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [voiceTheme, setVoiceTheme] = useState<RecordVoiceTheme>("emotional");
  const [tripTheme, setTripTheme] = useState<RecordTripTheme>("nature");

  const addPhotosFromLibrary = useCallback((assets: ImagePickerAsset[]) => {
    const incomingPhotos = assets.map(createDraftPhoto);

    setPhotoDetails((currentDetails) => {
      const nextDetails = { ...currentDetails };
      incomingPhotos.forEach((photo) => {
        nextDetails[photo.id] ??= initialPhotoDetails(photo);
      });
      return nextDetails;
    });

    setPhotos((currentPhotos) => {
      const currentIds = new Set(currentPhotos.map((photo) => photo.id));
      const uniqueIncomingPhotos = incomingPhotos.filter(
        (photo) => !currentIds.has(photo.id),
      );

      return [...currentPhotos, ...uniqueIncomingPhotos].slice(0, 8);
    });
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((currentPhotos) =>
      currentPhotos.filter((photo) => photo.id !== photoId),
    );
    setSelectedPhotoId((currentId) =>
      currentId === photoId ? null : currentId,
    );
    setPhotoDetails((currentDetails) => {
      const { [photoId]: _removedDetails, ...remainingDetails } =
        currentDetails;
      return remainingDetails;
    });
  }, []);

  const selectPhotoForInfo = useCallback((photoId: string) => {
    setSelectedPhotoId(photoId);
  }, []);

  const selectedPhoto =
    photos.find((photo) => photo.id === selectedPhotoId) ?? photos[0];
  const selectedPhotoDetails = selectedPhoto
    ? (photoDetails[selectedPhoto.id] ?? initialPhotoDetails(selectedPhoto))
    : fallbackPhotoDetails;
  const photoDate = selectedPhotoDetails.date;
  const photoPlace = selectedPhotoDetails.place;

  const setPhotoDate = useCallback(
    (date: string) => {
      if (!selectedPhoto) {
        return;
      }

      setPhotoDetails((currentDetails) => ({
        ...currentDetails,
        [selectedPhoto.id]: {
          ...(currentDetails[selectedPhoto.id] ??
            initialPhotoDetails(selectedPhoto)),
          date,
        },
      }));
    },
    [selectedPhoto],
  );

  const setPhotoPlace = useCallback(
    (place: string) => {
      if (!selectedPhoto) {
        return;
      }

      setPhotoDetails((currentDetails) => ({
        ...currentDetails,
        [selectedPhoto.id]: {
          ...(currentDetails[selectedPhoto.id] ??
            initialPhotoDetails(selectedPhoto)),
          place,
        },
      }));
    },
    [selectedPhoto],
  );

  const getPhotoDetails = useCallback(
    (photoId: string) => {
      const photo = photos.find((candidate) => candidate.id === photoId);
      return photoDetails[photoId] ?? initialPhotoDetails(photo);
    },
    [photoDetails, photos],
  );

  const visits = useMemo<DraftVisit[]>(() => {
    const seen = new Set<string>();

    return photos.flatMap((photo) => {
      const details = photoDetails[photo.id] ?? initialPhotoDetails(photo);
      const visitKey = `${details.date}:${details.place}`;
      if (seen.has(visitKey)) {
        return [];
      }
      seen.add(visitKey);

      const place = placeFixtures.find(
        (candidate) => candidate.name === details.place,
      );

      return [
        {
          date: details.date.replaceAll("-", "."),
          id: `visit:${visitKey}`,
          name: place ? `${place.address} ${place.name}` : details.place,
        },
      ];
    });
  }, [photoDetails, photos]);

  const resetDraft = useCallback(() => {
    setPhotos([]);
    setPhotoDetails({});
    setSelectedPhotoId(null);
    setVoiceTheme("emotional");
    setTripTheme("nature");
  }, []);

  const value = useMemo<CreateRecordSessionValue>(
    () => ({
      addPhotosFromLibrary,
      completedRecord,
      getPhotoDetails,
      photoDate,
      photoPlace,
      photos,
      removePhoto,
      resetDraft,
      selectPhotoForInfo,
      selectedPhoto,
      setCompletedRecord,
      setPhotoDate,
      setPhotoPlace,
      setTripTheme,
      setVoiceTheme,
      tripTheme,
      visits,
      voiceTheme,
    }),
    [
      addPhotosFromLibrary,
      completedRecord,
      getPhotoDetails,
      photoDate,
      photoPlace,
      photos,
      removePhoto,
      resetDraft,
      selectPhotoForInfo,
      selectedPhoto,
      setPhotoDate,
      setPhotoPlace,
      tripTheme,
      visits,
      voiceTheme,
    ],
  );

  return (
    <CreateRecordSessionContext.Provider value={value}>
      {children}
    </CreateRecordSessionContext.Provider>
  );
}

export function useCreateRecordSession() {
  const value = useContext(CreateRecordSessionContext);

  if (!value) {
    throw new Error(
      "useCreateRecordSession must be used inside CreateRecordSessionProvider",
    );
  }

  return value;
}
