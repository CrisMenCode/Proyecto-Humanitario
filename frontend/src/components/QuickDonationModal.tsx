import { useState, useRef, useEffect } from "react";
import type { FormEvent } from "react";
import { HeartHandshake, X, LoaderCircle, CheckCircle } from "lucide-react";
import { useResourceMutations } from "../hooks/useResources";
import type { Resource } from "../types";

export function QuickDonationModal({
  supply,
  close,
  saved,
}: {
  supply: Resource;
  close: () => void;
  saved: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const faltante = Number(supply.faltante ?? 0);
  const [amount, setAmount] = useState<number>(faltante > 0 ? faltante : 1);
  const { save } = useResourceMutations("insumos");

  useEffect(() => {
    dialog.current?.showModal();
  }, []);

  const totalDespues = Number(supply.cantidad_recibida ?? 0) + Number(amount);
  const metaCubierta = totalDespues >= Number(supply.cantidad_requerida);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (amount <= 0) return;
    try {
      await save.mutateAsync({
        id: supply.id,
        body: {
          cantidad_recibida: totalDespues,
        },
      });
      saved();
      close();
    } catch {
      /* El error se maneja en el hook */
    }
  }

  return (
    <dialog
      ref={dialog}
      className="modal compact-modal"
      onCancel={(e) => {
        e.preventDefault();
        if (!save.isPending) close();
      }}
    >
      <div className="modal-heading">
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: "#dcfce7",
              color: "#15803d",
              padding: "6px",
              borderRadius: "8px",
              display: "grid",
              placeItems: "center",
            }}
          >
            <HeartHandshake size={20} />
          </span>
          <div>
            <span className="eyebrow">REGISTRO RÁPIDO DE DONACIÓN</span>
            <h2 style={{ fontSize: "1.15rem", margin: 0 }}>{supply.nombre}</h2>
          </div>
        </div>
        <button
          className="icon-button"
          onClick={close}
          disabled={save.isPending}
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>
      </div>

      <form onSubmit={submit}>
        <div style={{ padding: "10px 0" }}>
          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "12px",
              marginBottom: "14px",
            }}
          >
            <div>
              <strong>Punto de recepción:</strong> {supply.punto_nombre || "Punto de acopio"}
            </div>
            <div>
              <strong>Estado actual:</strong> {supply.cantidad_recibida} de{" "}
              {supply.cantidad_requerida} {supply.unidad}
              {faltante > 0 ? ` (Faltan ${faltante})` : " (Meta alcanzada)"}
            </div>
          </div>

          <label
            htmlFor="donate-amount"
            style={{
              display: "block",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: "6px",
              color: "#374151",
            }}
          >
            Cantidad recibida a ingresar ({supply.unidad}):
          </label>
          <input
            id="donate-amount"
            type="number"
            min={1}
            required
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "14px",
              borderRadius: "6px",
              border: "1px solid #cbd5e1",
              marginBottom: "10px",
            }}
          />

          {metaCubierta && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                color: "#15803d",
                fontSize: "11.5px",
                fontWeight: 600,
                marginTop: "4px",
              }}
            >
              <CheckCircle size={15} />
              <span>¡Con este aporte la meta quedará 100% cubierta! 🎉</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="button secondary"
            onClick={close}
            disabled={save.isPending}
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="button primary"
            disabled={save.isPending || amount <= 0}
          >
            {save.isPending ? (
              <>
                <LoaderCircle size={15} className="spin" /> Guardando…
              </>
            ) : (
              "Confirmar recepción"
            )}
          </button>
        </div>
      </form>
    </dialog>
  );
}

