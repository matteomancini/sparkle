import React, { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimesCircle } from "@fortawesome/free-solid-svg-icons";

import { getLinkFromText } from "utils/getLinkFromText";

import "./AnnouncementMessage.scss";

import { BannerFormData } from "types/banner";

type AnnouncementMessageProps = {
  banner?: BannerFormData;
  isCancel?: boolean;
};

export const AnnouncementMessage: React.FC<AnnouncementMessageProps> = ({
  banner,
  isCancel = false,
}) => {
  const [isVisible, setVisibility] = useState<boolean>(false);

  const hideAnnouncement = useCallback(() => {
    setVisibility(false);
  }, []);

  useEffect(() => {
    if (banner?.content) {
      setVisibility(true);
    }
  }, [banner]);

  if (!isVisible || !banner?.content) return null;

  return (
    <div className="announcement-container">
      <div className="announcement-message">
        {getLinkFromText(banner.content)}
      </div>
      {isCancel ? (
        <span className="close-button" onClick={hideAnnouncement}>
          <FontAwesomeIcon icon={faTimesCircle} />
        </span>
      ) : null}
    </div>
  );
};

/**
 * @deprecated use named export instead
 */
export default AnnouncementMessage;
