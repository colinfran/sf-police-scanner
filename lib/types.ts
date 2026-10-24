export interface Call {
  id: string;
  cad_number?: string;
  received_datetime: string;
  /** YYYY-MM-DD in SF local time, derived from received_datetime */
  received_date: string;
  entry_datetime?: string;
  dispatch_datetime?: string;
  enroute_datetime?: string;
  onscene_datetime?: string;
  close_datetime?: string;
  call_type_original?: string;
  call_type_original_desc?: string;
  call_type_final?: string;
  call_type_final_desc?: string;
  priority_original?: string;
  priority_final?: string;
  agency?: string;
  onview_flag?: string;
  sensitive_call?: boolean;
  intersection_name?: string;
  intersection_id?: string;
  intersection_point?: { type: "Point"; coordinates: [number, number] };
  supervisor_district?: string;
  analysis_neighborhood?: string;
  police_district?: string;
  disposition?: string;
  call_last_updated_at?: string;
  data_as_of?: string;
  data_loaded_at?: string;
}

export interface SyncState {
  _id: "sync";
  cursor: string;
  lastSyncAt: Date;
  dataAsOf?: string;
}

export interface Day {
  date: string;
  count: number;
}
