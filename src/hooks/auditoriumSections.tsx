import React, { useCallback, useMemo } from "react";

import { UserProfilePicture } from "components/molecules/UserProfilePicture";

import { setGridData } from "api/profile";

import { convertToCartesianCoordinate } from "utils/auditorium";

import { GridPosition } from "types/grid";

import {
  currentAuditoriumSectionsSelector,
  currentAuditoriumSectionsByIdSelector,
} from "utils/selectors";

import { useSelector } from "./useSelector";
import { useFirestoreConnect, isLoaded } from "./useFirestoreConnect";
import { useRecentVenueUsers } from "./users";
import { useUser } from "./useUser";
import { GetUserByPostion, useGetUserByPosition } from "./useGetUserByPosition";

const useConnectAuditoriumSections = (venueId?: string) => {
  useFirestoreConnect(() => {
    if (!venueId) return [];

    return [
      {
        collection: "venues",
        doc: venueId,
        subcollections: [{ collection: "sections" }],
        storeAs: "currentAuditoriumSections",
      },
    ];
  });
};

export interface UseAuditoriumSectionProps {
  rows: number;
  columns: number;
  videoWidthInSeats: number;
  videoHeightInSeats: number;
  sectionId?: string;
  venueId?: string;
}

export const useAuditoriumSection = ({
  venueId,
  sectionId,
  rows,
  columns,
  videoWidthInSeats,
  videoHeightInSeats,
}: UseAuditoriumSectionProps) => {
  useConnectAuditoriumSections(venueId);

  const { userWithId } = useUser();
  const userId = userWithId?.id;

  const sectionsById = useSelector(currentAuditoriumSectionsByIdSelector);
  const section = sectionId ? sectionsById?.[sectionId] : undefined;

  const seatedUsers = useSectionSeatedUsers(venueId, sectionId);

  const getUserBySeat = useGetUserByPosition({
    venueId,
    positionedUsers: seatedUsers,
  });

  const takeSeat: (
    gridPosition: GridPosition
  ) => Promise<void> | undefined = useCallback(
    ({ row, column }: GridPosition) => {
      if (!sectionId || !venueId || !userId) return;

      return setGridData({
        venueId,
        userId,
        gridData: { sectionId, row, column },
      });
    },
    [sectionId, venueId, userId]
  );

  const leaveSeat: () => Promise<void> | undefined = useCallback(() => {
    if (!venueId || !userId) return;

    return setGridData({ venueId, userId, gridData: undefined });
  }, [venueId, userId]);

  const checkIfSeat = useCallback(
    ({ row, column }: GridPosition) => {
      const covertedRowCoordinate = convertToCartesianCoordinate({
        index: row,
        totalAmount: rows,
      });
      const convertedColumnCoordinate = convertToCartesianCoordinate({
        index: column,
        totalAmount: columns,
      });

      const isInVideoRow =
        Math.abs(covertedRowCoordinate) <= videoHeightInSeats / 2;
      const isInVideoColumn =
        Math.abs(convertedColumnCoordinate) <= videoWidthInSeats / 2;

      return !(isInVideoRow && isInVideoColumn);
    },
    [rows, columns, videoHeightInSeats, videoWidthInSeats]
  );

  return {
    auditoriumSection: section,
    isAuditoriumSectionLoaded: isLoaded(sectionsById),

    getUserBySeat,
    takeSeat,
    leaveSeat,
    checkIfSeat,
  };
};

export const useSectionSeatedUsers = (venueId?: string, sectionId?: string) => {
  const { recentVenueUsers } = useRecentVenueUsers();

  return useMemo(
    () =>
      recentVenueUsers.filter(
        (user) =>
          venueId && sectionId && user.data?.[venueId]?.sectionId === sectionId
      ),
    [recentVenueUsers, venueId, sectionId]
  );
};

export const useAuditoriumSections = (venueId?: string) => {
  useConnectAuditoriumSections(venueId);

  const sections = useSelector(currentAuditoriumSectionsSelector);

  return useMemo(
    () => ({
      auditoriumSections: sections ?? [],
      isAuditoriumSectionsLoaded: isLoaded(sections),
    }),
    [sections]
  );
};

export interface UseAuditoriumGridProps {
  rows: number;
  columns: number;
  getUserBySeat: GetUserByPostion;
  checkIfSeat: (gridData: GridPosition) => boolean;
  takeSeat: (gridData: GridPosition) => Promise<void> | undefined;
}

export const useAuditoriumGrid = ({
  rows,
  columns,
  checkIfSeat,
  getUserBySeat,
  takeSeat,
}: UseAuditoriumGridProps) =>
  useMemo(
    () =>
      Array.from(Array(rows)).map((_, rowIndex) => (
        <div key={rowIndex} className="section__seats-row">
          {Array.from(Array(columns)).map((_, columnIndex) => {
            const user = getUserBySeat({
              row: rowIndex,
              column: columnIndex,
            });

            if (user) {
              return (
                <UserProfilePicture
                  key={columnIndex}
                  user={user}
                  avatarClassName="section__user-avatar"
                  isAudioEffectDisabled
                />
              );
            }

            const isSeat = checkIfSeat({ row: rowIndex, column: columnIndex });

            if (isSeat) {
              return (
                <div
                  key={columnIndex}
                  className="section__seat"
                  onClick={() =>
                    takeSeat({ row: rowIndex, column: columnIndex })
                  }
                >
                  +
                </div>
              );
            }

            return <div key={columnIndex} className="section__empty-circle" />;
          })}
        </div>
      )),
    [rows, columns, checkIfSeat, takeSeat, getUserBySeat]
  );
