import type { ImagePickerAsset } from "expo-image-picker";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

import type { TouristPlaceCandidate } from "@/entities/tourist-place";

import { createDraftPhoto } from "./photoMetadata";
import type {
  DraftPhoto,
  DraftVisit,
  LocationSearchDecision,
  RecordTripTheme,
  RecordVoiceTheme,
} from "./types";

type CreateRecordSessionValue = {
  addPhotosFromLibrary: (assets: ImagePickerAsset[]) => void;
  decideLocationSearch: (
    decision: Exclude<LocationSearchDecision, "undecided">,
  ) => void;
  discardTransientGps: (photoId?: string) => void;
  finishDraft: () => void;
  getPhotoDetails: (photoId: string) => PhotoDetails;
  isDraftCommitted: boolean;
  photoDate: string;
  photoPlace?: TouristPlaceCandidate;
  photos: DraftPhoto[];
  locationSearchDecision: LocationSearchDecision;
  removePhoto: (photoId: string) => void;
  resetDraft: () => void;
  selectPhotoForInfo: (photoId: string) => void;
  selectedPhoto?: DraftPhoto;
  setPhotoDate: (date: string) => void;
  setPhotoPlace: (place: TouristPlaceCandidate) => void;
  setTripTheme: (theme: RecordTripTheme) => void;
  setVoiceTheme: (theme: RecordVoiceTheme) => void;
  tripTheme: RecordTripTheme;
  visits: DraftVisit[];
  voiceTheme: RecordVoiceTheme;
};

type PhotoDetails = {
  date: string;
  place?: TouristPlaceCandidate;
};

const today = new Date();
const fallbackPhotoDetails: PhotoDetails = {
  date: [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-"),
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
  const [locationSearchDecision, setLocationSearchDecision] =
    useState<LocationSearchDecision>("undecided");
  const [isDraftCommitted, setIsDraftCommitted] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [voiceTheme, setVoiceTheme] = useState<RecordVoiceTheme>("emotional");
  const [tripTheme, setTripTheme] = useState<RecordTripTheme>("nature");

  const addPhotosFromLibrary = useCallback(
    (assets: ImagePickerAsset[]) => {
      setIsDraftCommitted(false);
      const incomingPhotos = assets.map(createDraftPhoto).map((photo) => {
        if (locationSearchDecision !== "manual") {
          return photo;
        }
        const { gps: _discardedGps, ...photoWithoutGps } = photo;
        return { ...photoWithoutGps, hasGps: false };
      });

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
    },
    [locationSearchDecision],
  );

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

  const discardTransientGps = useCallback((photoId?: string) => {
    setPhotos((currentPhotos) =>
      currentPhotos.map((currentPhoto) => {
        if (photoId && currentPhoto.id !== photoId) {
          return currentPhoto;
        }

        const { gps: _discardedGps, ...photo } = currentPhoto;
        return { ...photo, hasGps: false };
      }),
    );
  }, []);

  const decideLocationSearch = useCallback(
    (decision: Exclude<LocationSearchDecision, "undecided">) => {
      setLocationSearchDecision(decision);
      if (decision === "manual") {
        discardTransientGps();
      }
    },
    [discardTransientGps],
  );

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
    (place: TouristPlaceCandidate) => {
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
      const place = details.place;
      if (!place) {
        return [];
      }
      const visitKey = `${details.date}:${place.contentId}`;
      if (seen.has(visitKey)) {
        return [];
      }
      seen.add(visitKey);

      return [
        {
          date: details.date.replaceAll("-", "."),
          id: `visit:${visitKey}`,
          name: [place.address, place.name].filter(Boolean).join(" "),
          place,
        },
      ];
    });
  }, [photoDetails, photos]);

  const resetDraft = useCallback(() => {
    setPhotos([]);
    setPhotoDetails({});
    setSelectedPhotoId(null);
    setLocationSearchDecision("undecided");
    setVoiceTheme("emotional");
    setTripTheme("nature");
    setIsDraftCommitted(false);
  }, []);

  const finishDraft = useCallback(() => {
    setPhotos([]);
    setPhotoDetails({});
    setSelectedPhotoId(null);
    setLocationSearchDecision("undecided");
    setVoiceTheme("emotional");
    setTripTheme("nature");
    setIsDraftCommitted(true);
  }, []);

  const value = useMemo<CreateRecordSessionValue>(
    () => ({
      addPhotosFromLibrary,
      decideLocationSearch,
      discardTransientGps,
      finishDraft,
      getPhotoDetails,
      isDraftCommitted,
      photoDate,
      photoPlace,
      photos,
      locationSearchDecision,
      removePhoto,
      resetDraft,
      selectPhotoForInfo,
      selectedPhoto,
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
      decideLocationSearch,
      discardTransientGps,
      finishDraft,
      getPhotoDetails,
      isDraftCommitted,
      photoDate,
      photoPlace,
      photos,
      locationSearchDecision,
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
