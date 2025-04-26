import { Link } from "react-router";
import { NPC } from "../types/Npc";
import { useEffect, useState } from "react";

type NpcProps = {
    npc: NPC;
}

export const NPCListItem = ({ npc }: NpcProps) => {

  const [generated, setGenerated] = useState(npc.generated);

  useEffect(() => {
    if (!generated) {
      const interval = setInterval(async () => {
        const response = await fetch(`/api/npcs/${npc.id}`);
        const data = await response.json();
        if (data.letter.generated) {
          setGenerated(true);
          clearInterval(interval);
        }
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [generated]);

  return (
    <div>
      {generated ? (
        <Link to={`/npcs/${npc.id}`}>
          <div
            style={{
              borderStyle: "solid",
              borderColor: "slateblue",
              borderRadius: "10px",
              marginLeft: "10px",
              padding: "10px",
              margin: "10px",
              cursor: "pointer",
            }}
          >
            {npc.npcName}
          </div>
        </Link>
      ) : (
        <div className="letter-title">
          {npc.npcName}
          <span className="not-generated"> Generating...</span>
        </div>
      )}
    </div>
  );
}