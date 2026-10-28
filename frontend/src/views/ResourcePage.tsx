import { useRef, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  MapPin,
} from "lucide-react";
import {
  useAllResources,
  useResourceMutations,
  useResources,
} from "../hooks/useResources";
import type { Resource, ResourceKey } from "../types";
import { resourceConfig } from "../resourceConfig";
import { ResourceForm } from "../components/ResourceForm";
import { CampaignCard } from "../components/CampaignCard";
import {
  Badge,
  Empty,
  ErrorState,
  Loading,
  Progress,
} from "../components/common";

function DeleteDialog({
  record,
  kind,
  close,
  deleted,
}: {
  record: Resource;
  kind: ResourceKey;
  close: () => void;
  deleted: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const { remove } = useResourceMutations(kind);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="modal compact-modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!remove.isPending) close();
      }}
      aria-labelledby="delete-title"
    >
      <div className="modal-heading">
        <h2 id="delete-title">Eliminar registro</h2>
        <button
          className="icon-button"
          aria-label="Cerrar confirmación"
          onClick={close}
          disabled={remove.isPending}
        >
          <X size={18} />
        </button>
      </div>
      <p>
        Vas a eliminar <strong>{record.nombre}</strong>. Esta acción no se puede
        deshacer.
      </p>
      <p className="muted">
        Si tiene registros relacionados, la API te indicará qué debes resolver
        primero.
      </p>
      {remove.error && <ErrorState error={remove.error} />}
      <div className="modal-footer">
        <button
          className="button secondary"
          onClick={close}
          disabled={remove.isPending}
        >
          Cancelar
        </button>
        <button
          className="button destructive"
          disabled={remove.isPending}
          onClick={async () => {
            try {
              await remove.mutateAsync(record.id);
              deleted();
            } catch {
              /* Mostrar error. */
            }
          }}
        >
          {remove.isPending ? "Eliminando…" : "Eliminar registro"}
        </button>
      </div>
    </dialog>
  );
}

export default function ResourcePage({ kind }: { kind: ResourceKey }) {
  const config = resourceConfig[kind];
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const campaign = Number(params.get("campana")) || undefined;
  const [form, setForm] = useState<Resource | "new" | null>(() =>
    params.get("crear") ? "new" : null,
  );
  const [deleting, setDeleting] = useState<Resource | null>(null);
  const [notice, setNotice] = useState("");
  const records = useResources(kind, { page, search, campana: campaign });
  const campaigns = useAllResources("campanas", {}, kind !== "campanas");
  useEffect(() => {
    if (params.get("crear") === "1") setForm("new");
  }, [params]);
  const closeForm = () => {
    setForm(null);
    if (params.has("crear")) {
      const next = new URLSearchParams(params);
      next.delete("crear");
      setParams(next, { replace: true });
    }
  };
  const actions = (record: Resource) => (
    <div className="table-actions">
      <button
        className="icon-button"
        aria-label={`Editar ${record.nombre}`}
        onClick={() => setForm(record)}
      >
        <Pencil size={16} />
      </button>
      <button
        className="icon-button danger"
        aria-label={`Eliminar ${record.nombre}`}
        onClick={() => setDeleting(record)}
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN SOLIDARIA</span>
          <h1>
            {config.title}
            <span className="title-dot">.</span>
          </h1>
          <p>{config.subtitle}</p>
        </div>
        <button className="button primary" onClick={() => setForm("new")}>
          <Plus size={17} />
          Agregar {config.singular}
        </button>
      </div>
      {notice && (
        <div className="success-box" role="status">
          <Check size={17} />
          {notice}
          <button
            className="icon-button"
            aria-label="Cerrar aviso"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="toolbar">
        <label className="search-input">
          <Search size={17} />
          <input
            aria-label={`Buscar ${config.title.toLowerCase()}`}
            placeholder={`Buscar ${config.title.toLowerCase()}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        {kind !== "campanas" && (
          <select
            aria-label="Filtrar por campaña"
            value={campaign || ""}
            onChange={(e) => {
              setParams(e.target.value ? { campana: e.target.value } : {});
              setPage(1);
            }}
          >
            <option value="">Todas las campañas</option>
            {campaigns.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nombre}
              </option>
            ))}
          </select>
        )}
        <span className="records-count">
          {records.data?.count ?? "—"} registros
        </span>
      </div>
      {campaigns.error && kind !== "campanas" && (
        <ErrorState
          error={campaigns.error}
          retry={() => void campaigns.refetch()}
        />
      )}
      {records.isPending ? (
        <Loading />
      ) : records.error ? (
        <ErrorState
          error={records.error}
          retry={() => void records.refetch()}
        />
      ) : !records.data?.results.length ? (
        <div className="panel">
          <Empty
            title={
              search
                ? "No encontramos coincidencias"
                : "Todavía no hay registros"
            }
          >
            {search
              ? "Prueba con otro nombre o cambia el filtro."
              : "Agrega el primer registro para empezar a coordinar la ayuda."}
          </Empty>
        </div>
      ) : kind === "campanas" ? (
        <div className="campaign-grid">
          {records.data.results.map((record) => (
            <CampaignCard
              key={record.id}
              campaign={record}
              edit={() => setForm(record)}
              remove={() => setDeleting(record)}
            />
          ))}
        </div>
      ) : (
        <div className="panel table-scroll">
          <table>
            <thead>
              <tr>
                <th>
                  {kind === "insumos"
                    ? "Insumo"
                    : kind === "voluntarios"
                      ? "Voluntario"
                      : "Punto de acopio"}
                </th>
                <th>Campaña</th>
                {kind === "insumos" ? (
                  <>
                    <th>Recibido / meta</th>
                    <th>Cobertura</th>
                    <th>Urgencia</th>
                  </>
                ) : kind === "voluntarios" ? (
                  <>
                    <th>Habilidades / función</th>
                    <th>Disponibilidad</th>
                    <th>Estado</th>
                  </>
                ) : (
                  <>
                    <th>Dirección</th>
                    <th>Horario</th>
                    <th>Estado</th>
                  </>
                )}
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {records.data.results.map((record) => (
                <tr key={record.id}>
                  <td>
                    <strong>{record.nombre}</strong>
                    <small>
                      {kind === "insumos"
                        ? record.punto_nombre
                        : `#${String(record.id).padStart(3, "0")}`}
                    </small>
                  </td>
                  <td>
                    <Link
                      className="table-link"
                      to={`/campanas/${record.campana}`}
                    >
                      {record.campana_nombre}
                    </Link>
                  </td>
                  {kind === "insumos" ? (
                    <>
                      <td className="nowrap">
                        {record.cantidad_recibida} / {record.cantidad_requerida}{" "}
                        <small>{record.unidad}</small>
                      </td>
                      <td>
                        <Progress value={record.cobertura} />
                      </td>
                      <td>
                        <Badge value={record.urgencia} />
                      </td>
                    </>
                  ) : kind === "voluntarios" ? (
                    <>
                      <td>
                        {record.habilidades}
                        <small>{record.rol}</small>
                      </td>
                      <td>{record.disponibilidad}</td>
                      <td>
                        <Badge value={record.activo} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td>
                        <div>{record.direccion}</div>
                        {record.direccion && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                              `${record.direccion}, Popayán, Colombia`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="map-link print-hide"
                            title="Ver en Google Maps"
                          >
                            <MapPin size={11} /> Ver en Maps
                          </a>
                        )}
                      </td>
                      <td>{record.horario}</td>
                      <td>
                        <Badge value={record.activo} />
                      </td>
                    </>
                  )}
                  <td>{actions(record)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {records.data && records.data.count > 12 && (
        <div className="pagination">
          <span>
            Página {page} de {Math.ceil(records.data.count / 12)}
          </span>
          <button
            className="button secondary small"
            disabled={page === 1 || records.isFetching}
            onClick={() => setPage(page - 1)}
          >
            <ArrowLeft size={15} />
            Anterior
          </button>
          <button
            className="button secondary small"
            disabled={page * 12 >= records.data.count || records.isFetching}
            onClick={() => setPage(page + 1)}
          >
            Siguiente
            <ArrowRight size={15} />
          </button>
        </div>
      )}
      {form && (
        <ResourceForm
          kind={kind}
          record={form === "new" ? undefined : form}
          campaign={campaign}
          close={closeForm}
          saved={() => {
            closeForm();
            setPage(1);
            setNotice("Registro guardado. La información ya está actualizada.");
          }}
        />
      )}
      {deleting && (
        <DeleteDialog
          kind={kind}
          record={deleting}
          close={() => setDeleting(null)}
          deleted={() => {
            setDeleting(null);
            setPage(1);
            setNotice("Registro eliminado correctamente.");
          }}
        />
      )}
    </>
  );
}
