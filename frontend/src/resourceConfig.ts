import type { ResourceKey } from "./types";

export interface Field {
  name: string;
  label: string;
  type?: "text" | "number" | "date" | "textarea" | "select" | "checkbox";
  options?: string[];
  min?: number;
  maxLength?: number;
  default?: string | boolean;
  relation?: "campanas" | "puntos-acopio";
}
const campaignField: Field = {
  name: "campana",
  label: "Campaña",
  type: "select",
  relation: "campanas",
};
const campaignStart = new Date().toLocaleDateString("sv-SE", {
  timeZone: "America/Bogota",
});
const campaignEnd = new Date(
  Date.now() + 14 * 24 * 60 * 60 * 1000,
).toLocaleDateString("sv-SE", { timeZone: "America/Bogota" });
export const resourceConfig: Record<
  ResourceKey,
  { title: string; singular: string; subtitle: string; fields: Field[] }
> = {
  campanas: {
    title: "Campañas",
    singular: "campaña",
    subtitle: "Cada iniciativa es una oportunidad para llegar más lejos.",
    fields: [
      { name: "nombre", label: "Nombre de la campaña", maxLength: 150 },
      { name: "municipio", label: "Municipio", maxLength: 100 },
      {
        name: "descripcion",
        label: "Descripción y contexto",
        type: "textarea",
      },
      {
        name: "fecha_inicio",
        label: "Fecha de inicio",
        type: "date",
        default: campaignStart,
      },
      {
        name: "fecha_fin",
        label: "Fecha de cierre",
        type: "date",
        default: campaignEnd,
      },
      {
        name: "familias_objetivo",
        label: "Familias que buscamos apoyar",
        type: "number",
        min: 1,
      },
      {
        name: "estado",
        label: "Estado",
        type: "select",
        options: ["borrador", "activa", "finalizada"],
        default: "activa",
      },
    ],
  },
  voluntarios: {
    title: "Voluntarios",
    singular: "voluntario",
    subtitle: "Las personas que convierten la solidaridad en acciones.",
    fields: [
      { name: "nombre", label: "Nombre", maxLength: 150 },
      campaignField,
      { name: "habilidades", label: "Habilidades", maxLength: 250 },
      { name: "disponibilidad", label: "Disponibilidad", maxLength: 150 },
      { name: "rol", label: "Función asignada", maxLength: 100 },
      {
        name: "activo",
        label: "Disponible para apoyar",
        type: "checkbox",
        default: true,
      },
    ],
  },
  "puntos-acopio": {
    title: "Puntos de acopio",
    singular: "punto de acopio",
    subtitle: "Lugares donde la ayuda comienza su recorrido.",
    fields: [
      { name: "nombre", label: "Nombre del punto", maxLength: 150 },
      campaignField,
      { name: "direccion", label: "Dirección", maxLength: 200 },
      { name: "horario", label: "Horario de recepción", maxLength: 150 },
      {
        name: "activo",
        label: "Punto habilitado",
        type: "checkbox",
        default: true,
      },
    ],
  },
  insumos: {
    title: "Insumos",
    singular: "insumo",
    subtitle: "Metas claras para que cada aporte llegue donde hace falta.",
    fields: [
      { name: "nombre", label: "Nombre del insumo", maxLength: 150 },
      campaignField,
      {
        name: "punto_acopio",
        label: "Punto de acopio",
        type: "select",
        relation: "puntos-acopio",
      },
      {
        name: "categoria",
        label: "Categoría",
        type: "select",
        options: ["agua", "alimentos", "higiene", "abrigo", "otros"],
        default: "alimentos",
      },
      { name: "unidad", label: "Unidad de medida", maxLength: 30 },
      {
        name: "cantidad_requerida",
        label: "Cantidad requerida",
        type: "number",
        min: 1,
      },
      {
        name: "cantidad_recibida",
        label: "Cantidad recibida",
        type: "number",
        min: 0,
        default: "0",
      },
      {
        name: "urgencia",
        label: "Urgencia registrada",
        type: "select",
        options: ["alta", "media", "baja"],
        default: "media",
      },
    ],
  },
};
