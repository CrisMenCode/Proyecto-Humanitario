import { Link } from "react-router";
import { ArrowUpRight, MapPin, Pencil, Trash2, Users } from "lucide-react";
import type { Resource } from "../types";
import { Badge, Progress } from "./common";

export function CampaignCard({
  campaign,
  edit,
  remove,
}: {
  campaign: Resource;
  edit?: () => void;
  remove?: () => void;
}) {
  return (
    <article className="campaign-card">
      <div className="card-top">
        <span className="location">
          <MapPin size={13} />
          {campaign.municipio}
        </span>
        <Badge value={campaign.estado} />
      </div>
      <Link to={`/campanas/${campaign.id}`} className="campaign-title">
        {campaign.nombre}
        <ArrowUpRight size={19} />
      </Link>
      <p className="campaign-description">{campaign.descripcion}</p>
      <div className="goal-line">
        <span>Metas de insumos cubiertas</span>
        <strong>{campaign.total_insumos || 0} metas</strong>
      </div>
      <Progress value={campaign.cobertura} />
      <div className="card-bottom">
        <span>
          <Users size={15} />
          {campaign.voluntarios_activos} voluntarios
        </span>
        <span className="card-actions">
          {edit && (
            <button
              className="icon-button"
              onClick={edit}
              aria-label={`Editar ${campaign.nombre}`}
            >
              <Pencil size={15} />
            </button>
          )}
          {remove && (
            <button
              className="icon-button danger"
              onClick={remove}
              aria-label={`Eliminar ${campaign.nombre}`}
            >
              <Trash2 size={15} />
            </button>
          )}
          <Link to={`/campanas/${campaign.id}`} className="text-link">
            Ver campaña <ArrowUpRight size={14} />
          </Link>
        </span>
      </div>
    </article>
  );
}
