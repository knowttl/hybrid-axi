export interface paths {
    "/hunting/matches/recent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List recent YARA hunting matches
         * @description Return the current user's YARA hunting matches that were not returned by this endpoint before, oldest first. Every returned match is marked as delivered, so it will not be returned again.
         */
        get: operations["3fa0911073aec064f0398d488f74c4f2"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/sample/{sha256}/overview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get hash's overview
         * @description Return overview for hash
         */
        get: operations["adc7c9ebb1c46f92f13f1a4e8dd0c9c3"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/query/run": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Run a search query
         * @description Submits a search query for execution. Queries may run synchronously or
         *     asynchronously depending on size and complexity. If processed
         *     asynchronously, the response returns a query ID that can be used to poll
         *     for results via `GET /api/labs/search/query/{id}/results`.
         *
         *     **Note:** This endpoint is expected to return a *minimal* data set for
         *     each match. To retrieve full details for a specific result, use
         *     `GET /api/v2/overview/{sha256}` or `GET /api/labs/sample/{sha256}/overview`.
         *     To retrieve the complete list of report IDs for a hash, use `GET /api/v2/search/hash`.
         */
        post: operations["60367d88a168e925cc6be05b55565ab6"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/query/{id}/results": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Get async search query results
         * @description Retrieves the status and results of a previously submitted search query
         *     (see `POST /api/labs/search/query/run`). While the query is still processing,
         *     returns the current status. Once complete, returns the full result set,
         *     sized according to the `size` parameter provided when the query was
         *     submitted.
         *
         *     **Note:** As with the search endpoint, results contain a *minimal* data
         *     set per match. Use `GET /api/v2/overview/{sha256}` or `GET /api/labs/sample/{sha256}/overview` for full details on a
         *     specific result, or `GET /api/v2/search/hash` for the complete list of report IDs for a hash.
         */
        get: operations["a385738306b200f7387851e538fe2e98"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/hunting/yara-rules": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List YARA hunting rules
         * @description Return the current user's YARA hunting rules
         */
        get: operations["0d965c4fe9b7806ced772d0b6b61b1b5"];
        put?: never;
        /**
         * Create YARA hunting rule
         * @description Create a new YARA hunting rule for the current user
         */
        post: operations["7dcab7838cd6eeea81243d256b05ecc2"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/hunting/yara-rules/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Return YARA hunting rule
         * @description Return a single YARA hunting rule owned by the current user
         */
        get: operations["d8d8833e20421f7c1175ca126646ba7b"];
        put?: never;
        /**
         * Update YARA hunting rule
         * @description Update a YARA hunting rule owned by the current user
         */
        post: operations["39bc2cb8ea5bab2edd9eb9fa161b819a"];
        /**
         * Delete YARA hunting rule
         * @description Delete a YARA hunting rule owned by the current user
         */
        delete: operations["63fb1846ad545a0551d782694673cb22"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        Activity: {
            behavior_tags?: string[];
            file_activity?: components["schemas"]["FileActivity"];
            mutex_activity?: components["schemas"]["MutexActivity"];
            network_activity?: components["schemas"]["NetworkActivity"];
            process_activity?: components["schemas"]["ProcessActivity"];
            registry_activity?: components["schemas"]["RegistryActivity"];
            sample_flags?: string[];
            sandbox_reports?: components["schemas"]["SandboxReport"][];
            stats?: components["schemas"]["ActivityStats"];
            strings?: components["schemas"]["StringsData"];
        };
        ActivityStats: {
            contacted_hosts_count?: number | null;
            contacted_urls_count?: number | null;
            dns_resolutions_count?: number | null;
            dropped_files_count?: number | null;
            embedded_domains_count?: number | null;
            embedded_ips_count?: number | null;
            embedded_urls_count?: number | null;
            extracted_files_count?: number | null;
            files_deleted_count?: number | null;
            files_written_count?: number | null;
            http_requests_count?: number | null;
            imported_dlls_count?: number | null;
            injected_processes_count?: number | null;
            mutex_created_count?: number | null;
            process_count?: number | null;
            registry_keys_created_count?: number | null;
            registry_keys_deleted_count?: number | null;
            registry_keys_modified_count?: number | null;
            registry_keys_opened_count?: number | null;
            registry_keys_queried_count?: number | null;
            registry_operations_count?: number | null;
            script_calls_count?: number | null;
            spawned_processes_count?: number | null;
        };
        AdditionalMetadata: {
            name?: string | null;
            type?: string | null;
            values?: [
            ];
        };
        AmsiCallEntry: {
            content?: string | null;
            result?: string | null;
            type?: string | null;
        };
        AttributeEntry: {
            sources?: components["schemas"]["Source"][];
            value?: string | null;
        };
        AttributionStats: {
            campaigns_count?: number | null;
            cves_count?: number | null;
            malware_families_count?: number | null;
            threat_actors_count?: number | null;
            threat_types_count?: number | null;
        };
        Attributions: {
            campaigns?: components["schemas"]["AttributeEntry"][];
            cves?: components["schemas"]["AttributeEntry"][];
            malware_config?: components["schemas"]["MalwareConfig"] | null;
            malware_families?: components["schemas"]["AttributeEntry"][];
            threat_actors?: components["schemas"]["AttributeEntry"][];
            threat_types?: components["schemas"]["AttributeEntry"][];
        };
        AvDetections: {
            engines?: {
                [key: string]: components["schemas"]["AvEngine"];
            };
        };
        AvEngine: {
            data_source?: string | null;
            error_message?: string | null;
            name?: string | null;
            permalink?: string | null;
            progress?: number | null;
            report_link?: string | null;
            status?: string | null;
            success?: boolean | null;
            threat_name?: string | null;
            verdict?: string | null;
        };
        AvStats: {
            malicious_count?: number | null;
            suspicious_count?: number | null;
            total_engines?: number | null;
        };
        Certificate: {
            is_valid?: boolean | null;
            issuer?: string | null;
            serial_number?: string | null;
            subject?: string | null;
            thumbprint_md5?: string | null;
            thumbprint_sha1?: string | null;
            /** Format: date-time */
            valid_from?: string | null;
            /** Format: date-time */
            valid_until?: string | null;
        };
        ContactedHostEntry: {
            address?: string | null;
            country?: string | null;
            port?: number | null;
            protocol?: string | null;
            sources?: components["schemas"]["Source"][];
        };
        CreatedFile: {
            null_byte?: boolean | null;
            path?: string | null;
        };
        DetectionSource: {
            name?: string | null;
            reasons?: string[];
            score?: number | null;
            tags?: string[];
            verdict?: string | null;
        };
        DetectionStats: {
            attributions?: components["schemas"]["AttributionStats"];
            av?: components["schemas"]["AvStats"];
            mitre_attacks?: components["schemas"]["MitreAttackStats"];
            rule_matches?: components["schemas"]["RuleMatchStats"];
            sandbox_signatures?: components["schemas"]["SandboxSignatureStats"];
        };
        DetectionSummary: {
            score?: number | null;
            sources?: components["schemas"]["DetectionSource"][];
            tags?: string[];
            verdict?: string | null;
        };
        Detections: {
            attributions?: components["schemas"]["Attributions"];
            av_detections?: components["schemas"]["AvDetections"];
            incidents?: components["schemas"]["IncidentEntry"][];
            indicators?: components["schemas"]["Indicator"][];
            intel_graph?: components["schemas"]["IntelGraph"];
            mitre_attacks?: components["schemas"]["MitreAttack"][];
            rule_matches?: components["schemas"]["RuleMatches"];
            sandbox_signatures?: components["schemas"]["SandboxSignature"][];
            stats?: components["schemas"]["DetectionStats"];
            summary?: components["schemas"]["DetectionSummary"];
        };
        DnsResolutionEntry: {
            address?: string | null;
            country?: string | null;
            domain?: string | null;
            /** Format: date-time */
            registrar_creation_date?: string | null;
            registrar_name?: string | null;
            registrar_name_servers?: string | null;
            registrar_organization?: string | null;
            sources?: components["schemas"]["Source"][];
            ttl?: number | null;
        };
        Error: {
            message?: string;
        };
        ExtractedFileEntry: {
            name?: string | null;
            sha256?: string | null;
            sources?: components["schemas"]["Source"][];
            verdict?: string | null;
        };
        FileAccessEntry: {
            mask?: string | null;
            path?: string | null;
            type?: string | null;
        };
        FileActivity: {
            extracted_files?: components["schemas"]["ExtractedFileEntry"][];
            files_deleted?: components["schemas"]["FileOperation"][];
            files_written?: components["schemas"]["FileOperation"][];
        };
        FileInfo: {
            /** Format: date-time */
            compiled_at?: string | null;
            /** Format: float */
            entropy?: number | null;
            file_name?: string | null;
            file_size?: number | null;
            file_type?: string[];
            file_type_id?: string | null;
            icon?: string | null;
            is_container_sample?: boolean | null;
        };
        FileOperation: {
            path?: string | null;
            sources?: components["schemas"]["Source"][];
        };
        Hashes: {
            imphash?: string | null;
            md5?: string | null;
            pehash?: string | null;
            sha1?: string | null;
            sha256?: string | null;
            sha512?: string | null;
            ssdeep?: string | null;
            ssdeep_chunks?: string[];
            tlsh?: string | null;
        };
        HttpRequestEntry: {
            header?: string | null;
            host?: string | null;
            host_ip?: string | null;
            method?: string | null;
            response_code?: string | null;
            response_phrase?: string | null;
            sources?: components["schemas"]["Source"][];
            url?: string | null;
        };
        IncidentDetail: {
            detail?: string | null;
        };
        IncidentEntry: {
            details?: components["schemas"]["IncidentDetail"][];
            details_count?: number | null;
            name?: string | null;
            sources?: components["schemas"]["Source"][];
        };
        Indicator: {
            confidence?: string | null;
            sources?: components["schemas"]["Source"][];
            type?: string | null;
            value?: string | null;
        };
        IndicatorsCount: {
            informative?: number | null;
            malicious?: number | null;
            suspicious?: number | null;
        };
        IntelGraph: {
            chains?: components["schemas"]["IntelGraphChain"][];
            map?: {
                [key: string]: components["schemas"]["IntelGraphNode"];
            };
        };
        IntelGraphChain: {
            edges?: components["schemas"]["IntelGraphEdge"][];
            id?: string | null;
            root?: string | null;
            verdict?: components["schemas"]["IntelGraphVerdict"];
        };
        IntelGraphEdge: {
            edge_kind?: string | null;
            from_key?: string | null;
            to_key?: string | null;
        };
        IntelGraphNode: {
            address_type?: string | null;
            algorithm?: string | null;
            /** Format: date-time */
            created_at?: string | null;
            description?: string | null;
            filetype?: string | null;
            filetype_short?: string | null;
            format?: string | null;
            matrix?: string | null;
            mime_type?: string | null;
            name?: string | null;
            repository?: string | null;
            secret_type?: string | null;
            tactic?: string | null;
            tags?: string[];
            technique?: string | null;
            type?: string | null;
            /** Format: date-time */
            updated_at?: string | null;
            value?: string | null;
            verdict?: components["schemas"]["IntelGraphVerdict"];
            version?: string | null;
        };
        IntelGraphVerdict: {
            reasons?: string[];
            verdict?: string | null;
            verdict_source?: string | null;
        };
        MalwareConfig: {
            c2_emails?: string[];
            c2_hosts?: string[];
            c2_urls?: string[];
            campaign_id?: string | null;
            coin_address?: string[];
            cryptographic_secret?: string[];
            mutex_names?: string[];
            threat_name?: string | null;
        };
        Metadata: {
            additional_metadata?: components["schemas"]["AdditionalMetadata"][];
            certificates?: components["schemas"]["Certificate"][];
            file_info?: components["schemas"]["FileInfo"];
            hashes?: components["schemas"]["Hashes"];
            pe_metadata?: components["schemas"]["PeMetadata"];
            submissions?: components["schemas"]["Submissions"];
        };
        MitreAttack: {
            attack_id?: string | null;
            attack_id_wiki?: string | null;
            identifiers?: components["schemas"]["MitreIdentifier"][];
            sources?: components["schemas"]["Source"][];
            tactic?: string | null;
            technique?: string | null;
        };
        MitreAttackStats: {
            total?: number | null;
        };
        MitreIdentifier: {
            type?: string | null;
            value?: string | null;
        };
        MutexActivity: {
            mutex_created?: components["schemas"]["MutexEntry"][];
        };
        MutexEntry: {
            name?: string | null;
            sources?: components["schemas"]["Source"][];
        };
        NetworkActivity: {
            contacted_hosts?: components["schemas"]["ContactedHostEntry"][];
            dns_resolutions?: components["schemas"]["DnsResolutionEntry"][];
            embedded_domains?: components["schemas"]["AttributeEntry"][];
            embedded_ips?: components["schemas"]["AttributeEntry"][];
            embedded_urls?: components["schemas"]["AttributeEntry"][];
            http_requests?: components["schemas"]["HttpRequestEntry"][];
        };
        Overview: {
            activity?: components["schemas"]["Activity"];
            detections?: components["schemas"]["Detections"];
            metadata?: components["schemas"]["Metadata"];
            overall_status?: string | null;
            report_ids?: components["schemas"]["ReportIds"];
            sha256?: string | null;
            threat_score?: number | null;
            /** Format: date-time */
            last_scan_at?: string | null;
            verdict?: string | null;
        };
        PeMetadata: {
            embedded_file_count?: number | null;
            export_count?: number | null;
            exported_functions?: string[];
            import_count?: number | null;
            imported_dlls?: string[];
            imported_functions?: string[];
            is_dll?: boolean | null;
            is_packed?: boolean | null;
            packer_name?: string | null;
            resource_count?: number | null;
            resource_summary?: components["schemas"]["PeResourceSummary"];
            resources?: components["schemas"]["PeResource"][];
            section_count?: number | null;
            section_names?: string[];
            sections?: components["schemas"]["PeSection"][];
            subsystem?: string | null;
            target_machine?: string | null;
        };
        PeResource: {
            /** Format: float */
            entropy?: number | null;
            language?: string | null;
            type?: string | null;
        };
        PeResourceCount: {
            count?: number | null;
            name?: string | null;
        };
        PeResourceSummary: {
            by_language?: components["schemas"]["PeResourceCount"][];
            by_type?: components["schemas"]["PeResourceCount"][];
            high_entropy_count?: number | null;
        };
        PeSection: {
            /** Format: float */
            entropy?: number | null;
            md5?: string | null;
            name?: string | null;
            raw_size?: number | null;
            virtual_address?: string | null;
            virtual_size?: number | null;
        };
        ProcessActivity: {
            all_imported_dlls?: string[];
            processes?: components["schemas"]["ProcessEntry"][];
            sources?: components["schemas"]["Source"][];
        };
        ProcessAvDetection: {
            label?: string | null;
            matched?: number | null;
            total?: number | null;
        };
        ProcessEntry: {
            amsi_calls?: components["schemas"]["AmsiCallEntry"][];
            av_detection?: components["schemas"]["ProcessAvDetection"];
            command_line?: string | null;
            created_files?: components["schemas"]["CreatedFile"][];
            file_accesses?: components["schemas"]["FileAccessEntry"][];
            flags?: string[];
            handles?: components["schemas"]["ProcessHandleEntry"][];
            icon?: string | null;
            modules?: components["schemas"]["ProcessModuleEntry"][];
            mutants?: string[];
            name?: string | null;
            normalized_path?: string | null;
            parent_uid?: string | null;
            pid?: number | null;
            ppid?: number | null;
            registry_operations?: components["schemas"]["RegistryOperation"][];
            script_calls?: components["schemas"]["ScriptCall"][];
            sha256?: string | null;
            uid?: string | null;
        };
        ProcessHandleEntry: {
            id?: number | null;
            path?: string | null;
            type?: string | null;
        };
        ProcessModuleEntry: {
            base_address?: string | null;
            interesting?: boolean | null;
            path?: string | null;
        };
        RecentMatch: {
            id?: string;
            rule_id?: string;
            identifier?: string;
            sample_sha256?: string;
            sample_name?: string;
            threat_categories?: [
            ];
            /** Format: date-time */
            match_date?: string;
        };
        RegistryActivity: {
            keys_created?: components["schemas"]["RegistryKey"][];
            keys_deleted?: components["schemas"]["RegistryKey"][];
            keys_modified?: components["schemas"]["RegistryKey"][];
        };
        RegistryKey: {
            key?: string | null;
            sources?: components["schemas"]["Source"][];
        };
        RegistryOperation: {
            key?: string | null;
            operation?: string | null;
            path?: string | null;
            status?: string | null;
            status_readable?: string | null;
            value?: string | null;
        };
        ReportIds: {
            sandbox_job_ids?: string[];
        };
        RuleMatchStats: {
            sigma_count?: number | null;
            suricata_count?: number | null;
            yara_count?: number | null;
        };
        RuleMatches: {
            sigma?: components["schemas"]["SigmaRule"][];
            suricata?: components["schemas"]["SuricataRule"][];
            yara?: components["schemas"]["YaraRule"][];
        };
        SandboxReport: {
            /** Format: date-time */
            analysis_start_time?: string | null;
            contacted_countries?: string[];
            environment_description?: string | null;
            environment_id?: number | null;
            error_type?: string | null;
            id?: string | null;
            indicators_count?: components["schemas"]["IndicatorsCount"];
            malware_family?: string | null;
            state?: string | null;
            submit_name?: string | null;
            tags?: string[];
            threat_score?: number | null;
            verdict?: string | null;
        };
        SandboxSignature: {
            category?: string | null;
            description?: string | null;
            id?: string | null;
            level?: string | null;
            mitre_attack_id?: string | null;
            name?: string | null;
            origin?: string | null;
            relevance?: number | null;
            sources?: components["schemas"]["Source"][];
        };
        SandboxSignatureStats: {
            informative_count?: number | null;
            malicious_count?: number | null;
            suspicious_count?: number | null;
            total?: number | null;
        };
        ScriptCall: {
            cls_id?: string | null;
            dispatch_id?: string | null;
            malicious_signatures?: string[];
            parameters?: [
            ];
            result?: string | null;
            status?: string | null;
        };
        SearchId: {
            id?: string;
        };
        SearchResult: {
            sha256?: string | null;
            submit_name?: string | null;
            type_short?: string[] | null;
            verdict?: string | null;
            last_seen?: string | null;
        };
        SearchResults: {
            number_of_results?: number;
            number_of_pages?: number;
            query_status?: string;
            results?: components["schemas"]["SearchResult"][];
        };
        SigmaRule: {
            created_at?: string | null;
            description?: string | null;
            external_author?: string | null;
            reference?: string | null;
            rule_name?: string | null;
            source?: string | null;
            tags?: string[];
            updated_at?: string | null;
        };
        Source: {
            report_id?: string | null;
            report_type?: string | null;
        };
        StringsData: {
            interesting_strings?: components["schemas"]["AttributeEntry"][];
        };
        Submissions: {
            first_seen?: number | null;
            last_multi_scan?: number | null;
            last_seen?: number | null;
        };
        SuricataRule: {
            category?: string | null;
            description?: string | null;
            destination_ip?: string | null;
            destination_port?: number | null;
            protocol?: string | null;
            sid?: number | null;
        };
        YaraHuntRule: {
            id?: string;
            identifier?: string;
            threat_categories?: string[];
            matches?: number;
            past_7_days_matches?: number;
            active?: boolean;
            daily_notifications_limit?: number | null;
            rule?: string;
            /** Format: date-time */
            created_at?: string;
            /** Format: date-time */
            updated_at?: string | null;
        };
        YaraRule: {
            /** Format: date-time */
            created_at?: string | null;
            description?: string | null;
            rule_name?: string | null;
            sources?: components["schemas"]["Source"][];
            tags?: string[];
            /** Format: date-time */
            updated_at?: string | null;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    "3fa0911073aec064f0398d488f74c4f2": {
        parameters: {
            query?: {
                /** @description Maximum number of matches to return (1-1000, default 100) */
                items_count?: number;
                /** @description Only return matches created after this date-time */
                search_after?: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["RecentMatch"][];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    adc7c9ebb1c46f92f13f1a4e8dd0c9c3: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description SHA256 for lookup */
                sha256: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Overview"];
                };
            };
            /** @description analysis is still in progress */
            425: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    "60367d88a168e925cc6be05b55565ab6": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Search input parameters */
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * @description Search query string.
                     * @example verdict:malicious AND score:80+ AND positives:10+
                     */
                    query: string;
                    /**
                     * @description Page number to display (1-based). Ignored in asynchronous mode.
                     * @default 1
                     */
                    page?: number;
                    /**
                     * @description Number of results per page. In asynchronous mode, the total number of results to return.
                     * @default 50
                     */
                    size?: number;
                    /**
                     * Format: date
                     * @description Start of the date range to search from (inclusive), in `YYYY-MM-DD` format.
                     * @default
                     */
                    date_from?: string;
                    /**
                     * Format: date
                     * @description End of the date range to search to (inclusive), in `YYYY-MM-DD` format.
                     * @default
                     */
                    date_to?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchResults"][];
                };
            };
            /** @description queued response */
            202: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchId"][];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    a385738306b200f7387851e538fe2e98: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of the asynchronous query returned by `POST /api/labs/search/query/run`. */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SearchResults"][];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    "0d965c4fe9b7806ced772d0b6b61b1b5": {
        parameters: {
            query?: {
                search?: string;
                threat_category?: string[];
                status?: "active" | "paused";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["YaraHuntRule"][];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    "7dcab7838cd6eeea81243d256b05ecc2": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description YARA rule parameters (JSON body) */
        requestBody: {
            content: {
                "application/json": {
                    /** @description Unique name of the rule */
                    identifier: string;
                    /** @description Threat categories the rule targets */
                    threat_categories: ("adware" | "banker" | "downloader" | "dropper" | "fakeav" | "hacktool" | "miner" | "phishing" | "pua" | "ransomware" | "spyware" | "trojan" | "virus" | "worm")[];
                    /** @description Whether the rule is active */
                    active?: boolean;
                    /** @description Maximum number of notifications per day */
                    daily_notifications_limit?: number;
                    /** @description YARA rule source */
                    rule: string;
                };
            };
        };
        responses: {
            /** @description success response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["YaraHuntRule"];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    d8d8833e20421f7c1175ca126646ba7b: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["YaraHuntRule"];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    "39bc2cb8ea5bab2edd9eb9fa161b819a": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        /** @description YARA rule fields to update (JSON body, only supplied fields are updated) */
        requestBody: {
            content: {
                "application/json": {
                    /** @description Unique name of the rule */
                    identifier?: string;
                    /** @description Threat categories the rule targets */
                    threat_categories?: ("adware" | "banker" | "downloader" | "dropper" | "fakeav" | "hacktool" | "miner" | "phishing" | "pua" | "ransomware" | "spyware" | "trojan" | "virus" | "worm")[];
                    /** @description Whether the rule is active */
                    active?: boolean;
                    /** @description Maximum number of notifications per day */
                    daily_notifications_limit?: number;
                    /** @description YARA rule source */
                    rule?: string;
                    /** @description When true, resets the all-time matches counter */
                    reset_counter?: boolean;
                };
            };
        };
        responses: {
            /** @description success response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["YaraHuntRule"];
                };
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    "63fb1846ad545a0551d782694673cb22": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description rule deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description error response */
            default: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}
