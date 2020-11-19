import React, { useState, useMemo, useRef, useCallback } from "react";
import {
  ReduxFirestoreQuerySetting,
  useFirestoreConnect,
} from "react-redux-firebase";
import { useHistory } from "react-router-dom";
import { OverlayTrigger, Popover } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTicketAlt } from "@fortawesome/free-solid-svg-icons";
import NavSearchBar from "components/molecules/NavSearchBar";

import firebase from "firebase/app";

import { RootState } from "index";
import { DEFAULT_PROFILE_IMAGE, PLAYA_VENUE_ID } from "settings";
import { IS_BURN } from "secrets";
import { UpcomingEvent } from "types/UpcomingEvent";
import { venueInsideUrl } from "utils/url";

import { useRadio } from "hooks/useRadio";
import { useSelector } from "hooks/useSelector";
import { useUser } from "hooks/useUser";
import { useVenueId } from "hooks/useVenueId";

import AuthenticationModal from "components/organisms/AuthenticationModal";
import { GiftTicketModal } from "components/organisms/GiftTicketModal/GiftTicketModal";
import { ProfilePopoverContent } from "components/organisms/ProfileModal";
import {
  RadioModal,
  RadioModalPropsType,
} from "components/organisms/RadioModal/RadioModal";
import { SchedulePageModal } from "components/organisms/SchedulePageModal/SchedulePageModal";

import UpcomingTickets from "components/molecules/UpcomingTickets";

import "./NavBar.scss";
import "./playa.scss";
import { currentVenueSelectorData } from "utils/selectors";

const TicketsPopover: React.FC<{ futureUpcoming: UpcomingEvent[] }> = (
  props: unknown,
  { futureUpcoming }
) => (
  <Popover id="popover-basic" {...props}>
    <Popover.Content>
      <UpcomingTickets events={futureUpcoming} />
    </Popover.Content>
  </Popover>
);

const ProfilePopover = (
  <Popover id="profile-popover">
    <Popover.Content>
      <ProfilePopoverContent />
    </Popover.Content>
  </Popover>
);

const GiftPopover = (
  <Popover id="gift-popover">
    <Popover.Content>
      <GiftTicketModal />
    </Popover.Content>
  </Popover>
);

const RadioPopover: React.FC<RadioModalPropsType> = (props) => (
  <Popover id="radio-popover">
    <Popover.Content>
      <RadioModal {...props} />
    </Popover.Content>
  </Popover>
);

const navBarSelector = (state: RootState) => ({
  venue: currentVenueSelectorData(state),
  privateChats: state.firestore.ordered.privatechats,
  radioStations: state.firestore.data.venues?.playa?.radioStations,
  parentVenue: state.firestore.data.parentVenue,
});

interface NavBarPropsType {
  redirectionUrl?: string;
}

const NavBar: React.FC<NavBarPropsType> = ({ redirectionUrl }) => {
  const { user, profile } = useUser();
  const venueId = useVenueId();
  const { venue, radioStations, parentVenue } = useSelector(navBarSelector);

  const venueParentId = venue?.parentId;
  const venueParentQuery = useMemo<ReduxFirestoreQuerySetting>(
    () => ({
      collection: "venues",
      doc: venueParentId,
      storeAs: "parentVenue",
    }),
    [venueParentId]
  );
  useFirestoreConnect(venueParentQuery);

  const {
    location: { pathname },
  } = useHistory();
  const isOnPlaya = pathname.toLowerCase() === venueInsideUrl(PLAYA_VENUE_ID);

  const now = firebase.firestore.Timestamp.fromDate(new Date());
  const futureUpcoming =
    venue?.events?.filter((e) => e.ts_utc.valueOf() > now.valueOf()) ?? []; //@debt typing does this exist?

  const hasUpcomingEvents = futureUpcoming && futureUpcoming.length > 0;

  // Authentication Modal
  const [isAuthenticationModalOpen, setIsAuthenticationModalOpen] = useState(
    false
  );
  const openAuthenticationModal = useCallback(() => {
    setIsAuthenticationModalOpen(true);
  }, []);
  const closeAuthenticationModal = useCallback(() => {
    setIsAuthenticationModalOpen(false);
  }, []);

  const sound = useMemo(
    () =>
      radioStations && radioStations.length
        ? new Audio(radioStations[0])
        : undefined,
    [radioStations]
  );

  const { volume, setVolume } = useRadio(sound);

  const radioFirstPlayStateLoaded = useRef(false);
  const showRadioOverlay = useMemo(() => {
    if (!radioFirstPlayStateLoaded.current) {
      const radioFirstPlayStorageKey = "radioFirstPlay";
      const radioFirstPlayState = localStorage.getItem(
        radioFirstPlayStorageKey
      );
      if (!radioFirstPlayState) {
        localStorage.setItem(radioFirstPlayStorageKey, JSON.stringify(true));
        return true;
      }
      radioFirstPlayStateLoaded.current = true;
    }
    return false;
  }, [radioFirstPlayStateLoaded]);

  const [isEventScheduleVisible, setEventScheduleVisible] = useState(false);
  const showEventSchedule = useCallback(() => {
    setEventScheduleVisible(true);
  }, []);
  const hideEventSchedule = useCallback(() => {
    setEventScheduleVisible(false);
  }, []);

  const parentVenueId = venue?.parentId ?? "";
  const backToParentVenue = useCallback(() => {
    window.location.href = venueInsideUrl(parentVenueId);
  }, [parentVenueId]);

  const navigateToHomepage = () => {
    const venueLink =
      redirectionUrl ?? venueId ? venueInsideUrl(venueId ?? "") : "/";

    window.location.href = venueLink;
  };

  return (
    <>
      <header>
        <div className={`navbar navbar_playa ${!isOnPlaya && "nonplaya"}`}>
          <div className="navbar-container">
            <div className="nav-logos">
              <div className="nav-sparkle-logo">
                <div></div>
              </div>
              <div
                className="nav-sparkle-logo_small"
                onClick={navigateToHomepage}
              >
                <div></div>
              </div>
              <div className="nav-party-logo" onClick={showEventSchedule}>
                Jam Online
              </div>
              {venue?.parentId && parentVenue?.name && (
                <span onClick={backToParentVenue} className="back-link">
                  Back{parentVenue ? ` to ${parentVenue.name}` : ""}
                </span>
              )}
            </div>
            {user ? (
              <>
                <div className="navbar-links">
                  <NavSearchBar />
                  {hasUpcomingEvents && (
                    <OverlayTrigger
                      trigger="click"
                      placement="bottom-end"
                      overlay={
                        <TicketsPopover futureUpcoming={futureUpcoming} />
                      }
                      rootClose={true}
                    >
                      <span className="tickets-icon">
                        <FontAwesomeIcon icon={faTicketAlt} />
                      </span>
                    </OverlayTrigger>
                  )}
                  {IS_BURN && venue?.showGiftATicket && (
                    <OverlayTrigger
                      trigger="click"
                      placement="bottom-end"
                      overlay={GiftPopover}
                      rootClose={true}
                    >
                      <span className="private-chat-icon">
                        <div className="navbar-link-gift" />
                      </span>
                    </OverlayTrigger>
                  )}
                  {IS_BURN && (
                    <OverlayTrigger
                      trigger="click"
                      placement="bottom-end"
                      overlay={
                        <RadioPopover
                          {...{ volume, setVolume, title: venue?.radioTitle }}
                        />
                      }
                      rootClose={true}
                      defaultShow={showRadioOverlay}
                    >
                      <div
                        className={`profile-icon navbar-link-radio ${
                          volume === 0 && "off"
                        }`}
                      />
                    </OverlayTrigger>
                  )}
                  <OverlayTrigger
                    trigger="click"
                    placement="bottom-end"
                    overlay={ProfilePopover}
                    rootClose={true}
                  >
                    <div className="navbar-link-profile">
                      <img
                        src={profile?.pictureUrl || DEFAULT_PROFILE_IMAGE}
                        className="profile-icon"
                        alt="avatar"
                        width="40"
                        height="40"
                      />
                    </div>
                  </OverlayTrigger>
                </div>
              </>
            ) : (
              <div
                className="log-in-button"
                style={{ marginTop: "20px" }}
                onClick={openAuthenticationModal}
              >
                Log in
              </div>
            )}
          </div>
        </div>
      </header>
      <AuthenticationModal
        show={isAuthenticationModalOpen}
        onHide={closeAuthenticationModal}
        showAuth="login"
      />
      <SchedulePageModal isVisible={isEventScheduleVisible} />
      <div
        className={`schedule-dropdown-backdrop ${
          isEventScheduleVisible ? "show" : ""
        }`}
        onClick={hideEventSchedule}
      />
    </>
  );
};

export default NavBar;
