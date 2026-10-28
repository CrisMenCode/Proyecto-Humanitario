import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { LoaderCircle, X } from "lucide-react";
import { useAllResources, useResourceMutations } from "../hooks/useResources";
import { ApiError } from "../services/api";
import { resourceConfig } from "../resourceConfig";
import type { Resource, ResourceKey } from "../types";
import { ErrorState } from "./common";

export function ResourceForm({
  kind,
  record,
  campaign,
  close,
  saved,
}: {
  kind: ResourceKey;
  record?: Resource;
  campaign?: number;
  close: () => void;
  saved: () => void;
}) {
  const config = resourceConfig[kind];
  const dialog = useRef<HTMLDialogElement>(null);
  const [values, setValues] = useState<Record<string, string | boolean>>(() =>
    Object.fromEntries(
      config.fields.map((field) => {
        const existing = record?.[field.name as keyof Resource];
        return [
          field.name,
          existing !== undefined
            ? typeof existing === "boolean"
              ? existing
              : String(existing)
            : field.name === "campana" && campaign
              ? String(campaign)
              : (field.default ?? (field.type === "checkbox" ? false : "")),
        ];
      }),
    ),
  );
  const campaigns = useAllResources("campanas", {}, kind !== "campanas");
  const selectedCampaign = Number(values.campana);
  const points = useAllResources(
    "puntos-acopio",
    { campana: selectedCampaign },
    kind === "insumos" && selectedCampaign > 0,
  );
  const { save } = useResourceMutations(kind);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  useEffect(() => {
    if (kind === "insumos" && points.data && points.data.length > 0) {
      const currentPointId = String(values.punto_acopio || "");
      const exists = points.data.some((p) => String(p.id) === currentPointId);
      if (!currentPointId || !exists) {
        setValues((prev) => ({ ...prev, punto_acopio: String(points.data[0].id) }));
      }
    }
  }, [kind, points.data, values.punto_acopio]);
  const dependentError =
    (kind !== "campanas" ? campaigns.error : null) ||
    (kind === "insumos" ? points.error : null);
  const fieldErrors = save.error instanceof ApiError ? save.error.fields : {};

  async function submit(event: FormEvent) {
    event.preventDefault();
    const body = Object.fromEntries(
      config.fields.map((field) => [
        field.name,
        field.type === "number" || field.relation
          ? Number(values[field.name])
          : values[field.name],
      ]),
    );
    try {
      await save.mutateAsync({ body, id: record?.id });
      saved();
    } catch {
      /* El error se presenta dentro del formulario. */
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!save.isPending) close();
      }}
      aria-labelledby="form-title"
    >
      <div className="modal-heading">
        <div>
          <span className="eyebrow">CENTRO DE COORDINACIÓN</span>
          <h2 id="form-title">
            {record ? "Editar" : "Nueva entrada de"} {config.singular}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Cerrar formulario"
          onClick={close}
          disabled={save.isPending}
        >
          <X size={20} />
        </button>
      </div>
      <form onSubmit={submit}>
        <div className="form-grid">
          {config.fields.map((field) => {
            const options =
              field.relation === "campanas"
                ? campaigns.data
                : field.relation === "puntos-acopio"
                  ? points.data
                  : undefined;
            const id = `field-${field.name}`;
            return (
              <div
                className={`field ${field.type === "textarea" ? "full" : ""} ${field.type === "checkbox" ? "check-field" : ""}`}
                key={field.name}
              >
                <label htmlFor={id}>{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    id={id}
                    required
                    rows={3}
                    value={String(values[field.name])}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                  />
                ) : field.type === "select" ? (
                  <select
                    id={id}
                    required
                    value={String(values[field.name])}
                    disabled={
                      save.isPending ||
                      (field.relation === "puntos-acopio" && !selectedCampaign)
                    }
                    onChange={(e) =>
                      setValues({
                        ...values,
                        [field.name]: e.target.value,
                        ...(field.name === "campana" && kind === "insumos"
                          ? { punto_acopio: "" }
                          : {}),
                      })
                    }
                  >
                    <option value="">
                      {field.relation &&
                      (field.relation === "campanas"
                        ? campaigns.isPending
                        : points.isFetching && !points.data)
                        ? "Cargando opciones…"
                        : "Selecciona una opción"}
                    </option>
                    {field.options?.map((option) => (
                      <option key={option} value={option}>
                        {option.charAt(0).toUpperCase() + option.slice(1)}
                      </option>
                    ))}
                    {options?.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.nombre}
                      </option>
                    ))}
                  </select>
                ) : field.type === "checkbox" ? (
                  <input
                    id={id}
                    type="checkbox"
                    checked={Boolean(values[field.name])}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.checked })
                    }
                  />
                ) : (
                  <input
                    id={id}
                    type={field.type || "text"}
                    required
                    min={field.min}
                    maxLength={field.maxLength}
                    value={String(values[field.name])}
                    onChange={(e) =>
                      setValues({ ...values, [field.name]: e.target.value })
                    }
                  />
                )}
                {fieldErrors[field.name] && (
                  <span className="field-error">
                    {String(fieldErrors[field.name])}
                  </span>
                )}
                {field.relation === "campanas" &&
                  campaigns.data?.length === 0 && (
                    <small>Crea primero una campaña.</small>
                  )}
                {field.relation === "puntos-acopio" &&
                  selectedCampaign > 0 &&
                  points.data?.length === 0 && (
                    <div
                      style={{
                        marginTop: "0.5rem",
                        padding: "0.75rem",
                        background: "#fffbeb",
                        borderRadius: "0.5rem",
                        border: "1px solid #fde68a",
                        color: "#92400e",
                        fontSize: "0.85rem",
                      }}
                    >
                      <p style={{ margin: "0 0 0.4rem 0", fontWeight: 600 }}>
                        ⚠️ Esta campaña no tiene puntos de acopio registrados.
                      </p>
                      <p style={{ margin: "0 0 0.4rem 0" }}>
                        Cada insumo requiere un punto de acopio asignado para saber dónde se recibe.
                      </p>
                      <a
                        href={`/puntos-acopio?campana=${selectedCampaign}&crear=1`}
                        style={{
                          color: "#b45309",
                          fontWeight: 600,
                          textDecoration: "underline",
                        }}
                      >
                        + Crear un punto de acopio para esta campaña
                      </a>
                    </div>
                  )}
              </div>
            );
          })}
        </div>
        {(save.error || dependentError) && (
          <ErrorState error={(save.error || dependentError)!} />
        )}
        <div className="modal-footer">
          <button
            className="button secondary"
            type="button"
            onClick={close}
            disabled={save.isPending}
          >
            Cancelar
          </button>
          <button
            className="button primary"
            disabled={
              save.isPending ||
              Boolean(dependentError) ||
              (kind !== "campanas" && campaigns.isPending) ||
              (kind === "insumos" && (points.isFetching || (points.data && points.data.length === 0)))
            }
          >
            {save.isPending && <LoaderCircle size={16} className="spin" />}
            {save.isPending
              ? "Guardando…"
              : record
                ? "Guardar cambios"
                : "Guardar registro"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
