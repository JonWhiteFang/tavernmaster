import { useEffect, useState } from "react";
import { listCampaigns } from "../data/campaigns";

type TitleScreenProps = {
  onNewCampaign: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onExit: () => void;
};

export default function TitleScreen({
  onNewCampaign,
  onContinue,
  onSettings,
  onExit
}: TitleScreenProps) {
  const [hasCampaigns, setHasCampaigns] = useState(false);

  useEffect(() => {
    void listCampaigns().then((campaigns) => {
      setHasCampaigns(campaigns.length > 0);
    });
  }, []);

  return (
    <div className="title-screen">
      <div className="title-content">
        <h1 className="title-logo">Tavern Master</h1>
        <p className="title-tagline">Solo D&D 5e with AI</p>

        <nav className="title-menu">
          <button className="title-btn" onClick={onNewCampaign}>
            New Campaign
          </button>
          <button className="title-btn" onClick={onContinue} disabled={!hasCampaigns}>
            Continue Campaign
          </button>
          <button className="title-btn" onClick={onSettings}>
            Settings
          </button>
          <button className="title-btn" onClick={onExit}>
            Exit
          </button>
        </nav>
      </div>
    </div>
  );
}
