export type ResourceKey =
  | "campanas"
  | "voluntarios"
  | "insumos"
  | "puntos-acopio";

export interface Resource {
  id: number;
  nombre: string;
  campana?: number;
  campana_nombre?: string;
  descripcion?: string;
  municipio?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  estado?: "borrador" | "activa" | "finalizada";
  familias_objetivo?: number;
  revision?: number;
  voluntarios_activos?: number;
  total_insumos?: number;
  necesidades_pendientes?: number;
  cobertura?: number;
  habilidades?: string;
  disponibilidad?: string;
  rol?: string;
  activo?: boolean;
  direccion?: string;
  horario?: string;
  punto_acopio?: number;
  punto_nombre?: string;
  categoria?: string;
  unidad?: string;
  cantidad_requerida?: number;
  cantidad_recibida?: number;
  urgencia?: "alta" | "media" | "baja";
  faltante?: number;
}

export interface Page<T> {
  count: number;
  page: number;
  page_size: number;
  results: T[];
}
export interface Filters {
  page?: number;
  page_size?: number;
  search?: string;
  campana?: number;
}
export interface Dashboard {
  campanas_activas: number;
  voluntarios_activos: number;
  necesidades_pendientes: number;
  puntos_activos: number;
  proveedor_ia: string;
}
export interface Analysis {
  id: string;
  campana: number;
  estado: "pendiente" | "procesando" | "completado" | "fallido";
  revision: number;
  proveedor: string;
  desactualizado: boolean;
  error: string;
  creado_en: string;
  resultado: null | {
    resumen: string;
    prioridades: {
      insumo_id: number;
      nivel: "alta" | "media" | "baja";
      motivo: string;
      accion: string;
    }[];
    recomendaciones: string[];
    datos_faltantes: string[];
  };
}
