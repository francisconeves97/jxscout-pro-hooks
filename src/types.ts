export interface Asset {
  file_path: string;
  url: string;
  content_type: string;
  is_inline_js?: boolean;
  is_discovered_chunk?: boolean;
}

export interface HookEvent {
  asset: Asset;
  project: string;
  project_working_directory: string;
}
