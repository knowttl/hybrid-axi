export interface paths {
    "/feed/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @deprecated
         * @description access a JSON feed (summary information) of last 250 reports from 24h
         */
        get: operations["c1eed959af43228c83ebf43554f3c541"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/feed/detonation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description retrieve a list of the 250 most recent Reports, including basic information. For more detailed insights, use one of the Summary endpoints to access additional report data */
        get: operations["90ffc0d89757c30cda41531e26c3daac"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/feed/quick-scan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description retrieve a list of the 2500 most recent successful Quick Scans, including basic information. For detailed information on a specific Quick Scan, use the /quick-scan/{id} endpoint */
        get: operations["6f846a8bc0bc73e905408f2e6da577a7"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/key/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return information about the used API key and it limits */
        get: operations["5e583bcbee466842da56ec9dbe819664"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/key/submission-quota": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return information about quota and current usage */
        get: operations["a638983ab386e3f17ede1ed9644220a8"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/overview/{sha256}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return overview for hash */
        get: operations["9981be6445da2c7e117a48dbc551f5f6"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/overview/{sha256}/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description refresh overview and download fresh data from external services */
        get: operations["cb21128a1fd6a0bfa882774482d1473d"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/overview/{sha256}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return overview for hash */
        get: operations["052627a17af8cc6ae5240f4684040902"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/overview/{sha256}/sample": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description downloading sample file */
        get: operations["f0861f681445a6b6dd6f1b9964cee1b8"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return list of available scanners */
        get: operations["04c731564495f3770c5d2e5d9971ecb2"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description submit a file for quick scan, you can check results in overview endpoint */
        post: operations["711bd2a6c5b9f2b4c34e8af6554274e3"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description submit a website's url or url with file for analysis */
        post: operations["458f96cf9b737894c0a7bd60f6e3f183"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/url-to-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @deprecated
         * @description submit a file by url for analysis
         */
        post: operations["1caeced3764dc67b0fc84b86cc9d5d74"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/url-for-analysis": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @deprecated
         * @description submit a url for analysis
         */
        post: operations["c1764f8d9ba84c12fedb7f73915ab380"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description some scanners need time to process file, if in response `finished` is set to false, then you need use this endpoint to get final results */
        get: operations["8b094dc6a7b763bfd4e25911ed8af72c"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/abuse-reports/new": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description allows to request report deletion */
        post: operations["a73895c4bd896396a8f59a02f49cac3b"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/abuse-reports/feed": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description returns hashes of samples that were qualified for removal due to abuse or were containing private data and dates when it happened */
        get: operations["d97c84ba3099decb501ba37e993ad225"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/certificate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description downloading certificate file from report (if available) */
        get: operations["654b1757059fe1083aa8ad456fb6b8c0"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/children": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description returns children reports ids, once given id indicated archive or container file */
        get: operations["fe428721a2d007320558f6c1322015b7"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/memory-dumps-list": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description list all memory dump files (if available) */
        get: operations["610507c03f2fd279e8bf7de42eb1b78b"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/memory-dump/extracted-strings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return strings extracted from memory dump */
        get: operations["a5ac630a36de6338b24cd231aae1b017"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/memory-dump/hex-dump": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return hex dump from memory dump */
        get: operations["39f01edd97d1aa8b83c7f339ccf58025"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/pcap": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description downloading network PCAP file from report (if available) */
        get: operations["efae3cf1c0edae0a3d48749f6897a022"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/report/json": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description downloading full report file in JSON format */
        get: operations["dd971989a7f758edc5d1c9a7f5fde421"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/sample": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description downloading sample file */
        get: operations["c674755592ec02c64ad836ae12d6d7bf"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/memory-strings": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description downloading all memory strings from report (if available) */
        get: operations["e01f9d5e492cbc72369f56397488365b"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/state": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return state of a submission */
        get: operations["a9bc4ff2646b8ebd3e94b21c17f32f37"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return summary of a submission */
        get: operations["b7bf5dba3bdd7e12a97034ad679b7358"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @deprecated
         * @description return summary of multiple submissions (bulk query)
         */
        post: operations["a692386204ede603328741f7b08e225a"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/file/{type}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @deprecated
         * @description downloading report data (e.g. JSON, XML, PCAP)
         */
        get: operations["7e872c46c1a5638b701b09cc68e03565"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/screenshots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description retrieve an array of screenshots from a report in the Base64 format. Note: may return less that are visible at the report page - at API, duplicates are removed */
        get: operations["db2dc105afde92f2df0d322b61143a5e"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/dropped-file/{hash}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @deprecated
         * @description retrieve single extracted/dropped binaries files for a report, as zip
         */
        get: operations["5d4fc0a422e9da082903f9ccf9b9bad1"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/dropped-file-raw/{hash}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description retrieve single extracted/dropped binaries files for a report */
        get: operations["e718eaeb76a4ebfd4781995e894d7cec"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/dropped-files": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * @deprecated
         * @description retrieve all extracted/dropped binaries files(in gzip compressed form) for a report, as zip
         */
        get: operations["ec44d43bdb74f2d7921a770ae549e81d"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/report/{id}/dropped-files-v2": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description retrieve all extracted/dropped binaries files for a report, as zip */
        get: operations["62a8676fdd00f35e04945f2f0b4ad07d"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/hash": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description converts any file hash format (MD5/SHA1/SHA256/SHA512) to SHA256 and returns all associated detonations reports */
        get: operations["b972462c6d0d664b328b10b9e91da4c9"];
        put?: never;
        /**
         * @deprecated
         * @description summary for given hash
         */
        post: operations["0197a6ff29eab44bf4d18d45bb67aedb"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/hashes": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @deprecated
         * @description summary for given hashes
         */
        post: operations["2f3268b2522562c9d49936fae22ea6c7"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/search/terms": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description search the database using the search terms */
        post: operations["5d7230cfa76c541818188ff3911bb6a2"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit/file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description submit a file for analysis */
        post: operations["e306d626e3fbbe3f10982ff88251b2b7"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit/url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description submit a website's url or url with file for analysis */
        post: operations["22e1723d4cec5c9b20d50715e4e5de8f"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit/url-to-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @deprecated
         * @description submit a file by url for analysis
         */
        post: operations["d23ebbf65a2b6ea472053d3478acdbaa"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit/url-for-analysis": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * @deprecated
         * @description submit a url for analysis
         */
        post: operations["10980b93e5209ab3dde97d651c2fc503"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit/hash-for-url": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description determine a SHA256 that an online file or URL submission will have when being processed by the system. Note: this is useful when looking up URL analysis */
        post: operations["e7a13bfd6ebcdc403f13efd8aa5f9bcc"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/submit/dropped-file": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description submit dropped file for analysis */
        post: operations["e2bce91701a469c9751d5a63da2869d9"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/quick-scan/{id}/convert-to-full": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** @description convert quick scan to sandbox report */
        post: operations["024cceff2dd2ddfad6a74251aad3b846"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/version": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return system elements versions */
        get: operations["145769f29b3862d158e74b6ddda845f1"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/environments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return information about available execution environments */
        get: operations["bd68b15f49c59048688402da2a9d5b90"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/action-scripts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return information about available action scripts */
        get: operations["13ea959829e5303a7aa453d5e74c503e"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/stats": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description contains a variety of webservice statistics, e.g. the total number of submissions, unique submissions, signature ID distribution, user comments, etc. */
        get: operations["5e878cfdb239f874742add7b9c519b41"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/configuration": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description a partial information about instance configuration */
        get: operations["d373372cf33e493b15d9678972b68268"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/queue-size": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return information about queue size */
        get: operations["04ea6a4ccdb477857ab825ca8ca8f4f5"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/system/total-submissions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description return total number of submission */
        get: operations["5a69498675db3f2db5cfdb50423feafb"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ActionScript: {
            name?: string;
            description?: string;
        };
        AmsiCall: {
            app_name?: string;
            filename?: string | null;
            raw_script_content?: string;
        };
        AnalysisRelatedUrl: {
            url?: string;
            verdict?: string;
            /** @description Available values: extracted, visited, submitted */
            type?: string;
        };
        AntiVirusResult: {
            name?: string;
            result?: boolean;
            threat_found?: string;
        };
        Certificate: {
            owner?: string | null;
            issuer?: string | null;
            serial_number?: string | null;
            md5?: string | null;
            sha1?: string | null;
            /** Format: date-time */
            valid_from?: string | null;
            /** Format: date-time */
            valid_until?: string | null;
        };
        CleanDnsReport: {
            type?: string | null;
            /** Format: date-time */
            reported_at?: string | null;
        };
        Configuration: {
            submit_allow_offline?: boolean;
            submit_allow_tor?: boolean;
            enable_quick_scan?: boolean;
        };
        CrowdStrikeAi: {
            executable_process_memory_analysis?: components["schemas"]["ExecutableProcessMemoryAnalysis"][];
            analysis_related_urls?: components["schemas"]["AnalysisRelatedUrl"][];
        };
        DailyFeed: {
            count?: number;
            status?: string;
            data?: components["schemas"]["SampleDailyFeed"][];
        };
        DetonationDailyFeed: {
            report_id?: string | null;
            md5?: string | null;
            sha1?: string | null;
            sha256?: string | null;
            sha512?: string | null;
            submit_name?: string | null;
            url_analysis?: boolean | null;
            size?: number | null;
            mime?: string | null;
            type?: string | null;
            type_short?: string[] | null;
            environment_id?: number | null;
            environment_description?: string | null;
            verdict?: number | null;
            verdict_human?: string | null;
        };
        DetonationParameters: {
            action_script?: string | null;
            experimental_anti_evasion?: boolean;
            script_logging?: boolean;
            allow_sample_tampering?: boolean;
            network_mode?: string;
            custom_system_date_time?: string | null;
            custom_commandline?: string | null;
            /** @description provided only for vetted users */
            document_password?: string | null;
            environment_variable?: string | null;
            dynamic_analysis_time?: number | null;
            comment?: string | null;
        };
        Environment: {
            /**
             * @deprecated
             * @description deprecated use environmentId instead
             */
            id?: string;
            environment_id?: number;
            description?: string;
            group_icon?: string;
            architecture?: string;
            analysis_mode?: string;
            /** @deprecated */
            virtual_machines?: string[];
            /** @deprecated */
            total_virtual_machines?: number;
            /** @deprecated */
            busy_virtual_machines?: number;
            /** @deprecated */
            invalid_virtual_machines?: number;
        };
        Error: {
            message?: string;
        };
        EtAlert: {
            source_ip?: string | null;
            destination_ip?: string | null;
            destination_port?: string | null;
            protocol?: string | null;
            signature_id?: string | null;
            signature_rev?: string | null;
            severity?: string | null;
            category?: string | null;
            description?: string | null;
        };
        ExecutableProcessMemoryAnalysis: components["schemas"]["MemoryDump"] & {
            verdict?: string;
        };
        ExtractedFile: {
            name?: string | null;
            file_path?: string | null;
            file_size?: number | null;
            sha1?: string | null;
            sha256?: string | null;
            md5?: string | null;
            type_tags?: string[] | null;
            description?: string | null;
            runtime_process?: string | null;
            threat_level?: number | null;
            threat_level_readable?: string | null;
            av_label?: string | null;
            av_matched?: number | null;
            av_total?: number | null;
            file_available_to_download?: boolean;
        };
        FileMetadata: {
            file_compositions?: string[];
            imported_objects?: string[];
            file_analysis?: string[];
            total_file_compositions_imports?: number | null;
        };
        FullMachineLearningModel: components["schemas"]["MachineLearningModel"] & {
            sha256?: string;
            report_id?: string | null;
        };
        Hash: {
            sha256?: string;
        };
        HostGeolocation: {
            ip?: string;
            latitude?: string;
            longitude?: string;
            country?: string;
        };
        Indicator: {
            id?: string;
            description?: string;
            threat_level?: string;
        };
        InstanceVersion: {
            /**
             * @deprecated
             * @description deprecated now same as sandbox
             */
            instance?: string;
            sandbox?: string;
            api?: string;
        };
        IntValue: {
            value?: number;
        };
        InterestingFiles: {
            sha256?: string;
            environment_id?: number | null;
            submit_name?: string;
            virustotal_detectrate_percent?: number | null;
            confidence_percent?: number | null;
        };
        Key: {
            api_key?: string;
            auth_level?: number;
            auth_level_name?: string;
            user?: components["schemas"]["User"] | null;
        };
        KeyBoolValue: {
            id?: string;
            value?: boolean;
        };
        KeyCredential: {
            api_key?: string;
            secret?: string;
        };
        KeyIntValue: {
            id?: string;
            value?: number;
        };
        KeyStringValue: {
            id?: string;
            value?: string;
        };
        MachineLearningModel: {
            name?: string;
            version?: string;
            status?: string;
            data?: components["schemas"]["KeyStringValue"][];
            /** Format: date-time */
            created_at?: string;
        };
        MachineLearningModelSearch: {
            number_of_results?: number;
            number_of_pages?: number;
            link_to_previous_page?: string | null;
            link_to_next_page?: string | null;
            results?: components["schemas"]["FullMachineLearningModel"][];
        };
        MaliciousReport: {
            sha256?: string;
            environment_id?: number | null;
            submit_name?: string;
            indicators?: number;
        };
        MemoryDump: {
            filename?: string;
            address?: string;
            flags?: string;
            file_process?: string | null;
            file_process_pid?: number | null;
            file_process_sha256?: string | null;
            file_process_disc_pathway?: string | null;
        };
        MemoryDumpExtractedStrings: {
            data?: string[];
        };
        MemoryDumpHexDump: {
            data?: string[];
        };
        MitreAttckBase: {
            tactic?: string;
            technique?: string;
            attck_id?: string | null;
            attck_id_wiki?: string | null;
            parent?: components["schemas"]["MitreAttckParent"] | null;
        };
        MitreAttckParent: {
            technique?: string;
            attck_id?: string | null;
            attck_id_wiki?: string | null;
        };
        MitreAttckSignature: components["schemas"]["MitreAttckBase"] & {
            malicious_identifiers_count?: number;
            /** @description populated only in some endpoints */
            malicious_identifiers?: string[];
            suspicious_identifiers_count?: number;
            /** @description populated only in some endpoints */
            suspicious_identifiers?: string[];
            informative_identifiers_count?: number;
            /** @description populated only in some endpoints */
            informative_identifiers?: string[];
            parent?: components["schemas"]["MitreAttckParent"] | null;
        };
        Overview: {
            sha256?: string;
            last_file_name?: string;
            other_file_name?: string[];
            threat_score?: number | null;
            verdict?: string;
            url_analysis?: boolean;
            size?: number;
            type?: string;
            type_short?: string[] | null;
            /** Format: date-time */
            submitted_at?: string;
            /** Format: date-time */
            analysis_start_time?: string | null;
            /** Format: date-time */
            last_multi_scan?: string | null;
            tags?: string[];
            /** @deprecated */
            architecture?: string | null;
            vx_family?: string | null;
            multiscan_result?: number | null;
            /**
             * @deprecated
             * @description Deprecated, please use 'scanners_v2' instead. More information in 2.22 version changelog
             */
            scanners?: components["schemas"]["Scanner"][];
            scanners_v2?: components["schemas"]["Scanners"] | null;
            submit_context?: string[];
            related_parent_hashes?: string[];
            related_children_hashes?: string[];
            reports?: string[];
            whitelisted?: boolean;
            children_in_queue?: number;
            children_in_progress?: number;
            community_score_votes_down?: number;
            community_score_votes_up?: number;
            related_reports?: components["schemas"]["SampleVerdict"][];
        };
        OverviewSummary: {
            sha256?: string | null;
            threat_score?: number | null;
            verdict?: string;
            /** Format: date-time */
            submitted_at?: string;
            /** Format: date-time */
            analysis_start_time?: string | null;
            /** Format: date-time */
            last_multi_scan?: string | null;
            multiscan_result?: number | null;
        };
        Process: {
            uid?: string | null;
            parentuid?: string | null;
            name?: string | null;
            normalized_path?: string | null;
            command_line?: string | null;
            sha256?: string | null;
            av_label?: string | null;
            av_matched?: number | null;
            av_total?: number | null;
            /** @description populated only in some endpoints */
            pid?: string | null;
            /**
             * Format: base64
             * @description populated only in some endpoints
             */
            icon?: string | null;
            /** @description populated only in some endpoints */
            file_accesses?: components["schemas"]["SampleAnalysisFileAccess"][];
            /** @description populated only in some endpoints */
            created_files?: components["schemas"]["SampleAnalysisCreatedFile"][];
            /** @description populated only in some endpoints */
            registry?: components["schemas"]["SampleAnalysisRegistryAccess"][];
            /** @description populated only in some endpoints */
            mutants?: string[];
            /** @description populated only in some endpoints */
            handles?: components["schemas"]["SampleAnalysisHandle"][];
            /** @description populated only in some endpoints */
            streams?: components["schemas"]["SampleAnalysisStream"][];
            /** @description populated only in some endpoints */
            script_calls?: components["schemas"]["SampleAnalysisScriptCall"][];
            /** @description populated only in some endpoints */
            process_flags?: components["schemas"]["ProcessFlag"][];
            /** @description populated only in some endpoints */
            amsi_calls?: components["schemas"]["AmsiCall"][];
            /** @description populated only in some endpoints */
            modules?: components["schemas"]["SampleAnalysisModule"][];
        };
        ProcessFlag: {
            name?: string;
            data?: string | null;
            /**
             * Format: base64
             * @deprecated
             */
            image?: string;
        };
        QuickScan: {
            sha256?: string;
            /** @description Deprecated, please use 'scanners_v2' instead. More information in 2.22 version changelog */
            scanners?: components["schemas"]["Scanner"][];
            scanners_v2?: components["schemas"]["Scanners"] | null;
            /**
             * @deprecated
             * @description Deprecated, always contains an empty array
             */
            whitelist?: components["schemas"]["KeyBoolValue"][] | null;
            reports?: string[] | null;
            finished?: boolean;
            id?: string;
        };
        QuickScanDailyFeed: {
            quick_scan_id?: string | null;
            integrations?: string[];
            sha256?: string | null;
            submit_name?: string | null;
            url_analysis?: boolean | null;
            size?: number | null;
            mime?: string | null;
            type?: string | null;
            type_short?: string[];
            verdict?: number | null;
            verdict_human?: string | null;
        };
        QuickScanService: {
            name?: string;
            available?: boolean;
            description?: string;
            supported_types?: string[];
        };
        QuotaForType: {
            quota?: components["schemas"]["QuotaValues"];
            used?: components["schemas"]["QuotaValues"];
            available?: components["schemas"]["QuotaValues"];
            quota_reached?: boolean;
        };
        QuotaOverall: {
            /** @deprecated */
            total?: components["schemas"]["QuotaForType"] | null;
            apikey?: components["schemas"]["QuotaForType"] | null;
            quota_reached?: boolean;
        };
        QuotaValues: {
            hour?: number | null;
            day?: number | null;
            week?: number | null;
            month?: number | null;
            year?: number | null;
            omega?: number | null;
        };
        RecentComment: {
            sha256?: string;
            environment_id?: number | null;
            comment?: string;
        };
        ReportAbuse: {
            sha256?: string;
            /** Format: date-time */
            deleted_at?: string | null;
        };
        ReportAbuseFeed: {
            number_of_results?: number;
            number_of_pages?: number;
            link_to_previous_page?: string | null;
            link_to_next_page?: string | null;
            falcon_mal_query_results?: components["schemas"]["ReportAbuse"][];
        };
        ReportAbuseNew: {
            id?: string;
            message?: string;
        };
        SampleAnalysisCreatedFile: {
            file?: string;
            null_byte?: boolean;
        };
        SampleAnalysisFileAccess: {
            type?: string;
            path?: string;
            mask?: string;
        };
        SampleAnalysisHandle: {
            id?: number;
            type?: string;
            path?: string;
        };
        SampleAnalysisModule: {
            path?: string;
            base?: string;
            interesting?: boolean;
        };
        SampleAnalysisRegistryAccess: {
            operation?: string | null;
            path?: string | null;
            key?: string | null;
            value?: string | null;
            status?: string | null;
            status_human_readable?: string | null;
        };
        SampleAnalysisScriptCall: {
            cls_id?: string | null;
            dispatch_id?: string | null;
            status?: string | null;
            result?: string | null;
            parameters?: components["schemas"]["SampleAnalysisScriptCallParameter"][];
            matched_malicious_signatures?: string[];
        };
        SampleAnalysisScriptCallParameter: {
            name?: string | null;
            value?: string | null;
            comment?: string | null;
            argument_number?: number | null;
            meaning?: string | null;
        };
        SampleAnalysisStream: {
            uid?: string | null;
            file_name?: string | null;
            human_keywords?: string | null;
            instructions?: string[] | null;
            executed?: boolean;
            matched_signatures?: components["schemas"]["KeyStringValue"][];
        };
        SampleChildState: {
            report_id?: string | null;
            state?: string | null;
            error_type?: string | null;
            error_origin?: string | null;
            error?: string | null;
        };
        SampleDailyFeed: {
            job_id?: string | null;
            md5?: string | null;
            sha1?: string | null;
            sha256?: string | null;
            interesting?: boolean | null;
            /** Format: date-time */
            analysis_start_time?: string | null;
            threat_score?: number | null;
            threat_level?: number | null;
            threat_level_human?: string | null;
            av_detect?: number | null;
            unknown?: boolean | null;
            vx_family?: string | null;
            tags?: string[] | null;
            submit_name?: string | null;
            url_analysis?: boolean | null;
            size?: number | null;
            type?: string | null;
            et_alerts_total?: number | null;
            et_alerts_real_total?: number | null;
            domains?: string[];
            domains_capped?: boolean | null;
            hosts?: string[];
            hosts_geolocation?: components["schemas"]["HostGeolocation"][] | null;
            hosts_capped?: boolean | null;
            compromised_hosts?: string[] | null;
            et_alerts?: components["schemas"]["EtAlert"][] | null;
            environment_id?: number | null;
            environment_description?: string | null;
            shared_analysis?: boolean | null;
            reliable?: boolean | null;
            report_url?: string | null;
            vt_detect?: number | null;
            ms_detect?: number | null;
            associated_email_headers?: components["schemas"]["KeyStringValue"][] | null;
            indicators?: components["schemas"]["Indicator"][] | null;
            public_references?: string[] | null;
            processes?: components["schemas"]["Process"][] | null;
            extracted_files?: components["schemas"]["ExtractedFile"][] | null;
            ssdeep?: string | null;
        };
        SampleGone: {
            message?: string;
            related_id?: string[];
        };
        SampleScreenshot: {
            name?: string;
            /** Format: base64 */
            image?: string;
            /** Format: date-time */
            date?: string;
        };
        SampleSearch: {
            verdict?: string | null;
            av_detect?: string | null;
            threat_score?: number | null;
            vx_family?: string | null;
            job_id?: string | null;
            sha256?: string | null;
            environment_id?: number | null;
            /** Format: date-time */
            analysis_start_time?: string | null;
            submit_name?: string | null;
            environment_description?: string | null;
            size?: number | null;
            type?: string | null;
            type_short?: string | null;
        };
        SampleState: {
            /**
             * @description state field in case of archive/container:
             *         - If all children are IN_QUEUE, parent is IN_QUEUE
             *         - A child is processed, if the state is SUCCESS or ERROR
             *         - If at least one child is IN_PROGRESS, the parent is IN_PROGRESS
             *         - If all children are processed and have a mixed state, the parent is PARTIAL_SUCCESS
             *         - If all children are processed and have the same state, the parent shares the same state
             */
            state?: string;
            error_type?: string | null;
            error_origin?: string | null;
            error?: string | null;
            related_reports?: components["schemas"]["SampleVerdict"][];
        };
        SampleStateQuery: components["schemas"]["SampleState"] & {
            query?: string;
            job_id?: string | null;
            sha256?: string | null;
            environment_id?: number | null;
            /**
             * @description state field in case of archive/container:
             *         - If all children are IN_QUEUE, parent is IN_QUEUE
             *         - A child is processed, if the state is SUCCESS or ERROR
             *         - If at least one child is IN_PROGRESS, the parent is IN_PROGRESS
             *         - If all children are processed and have a mixed state, the parent is PARTIAL_SUCCESS
             *         - If all children are processed and have the same state, the parent shares the same state
             */
            state?: string;
            error_type?: string | null;
            error_origin?: string | null;
            error?: string | null;
            related_reports?: components["schemas"]["SampleVerdict"][];
        };
        SampleSummary: {
            job_id?: string | null;
            environment_id?: number | null;
            environment_description?: string | null;
            size?: number | null;
            type?: string | null;
            type_short?: string[] | null;
            target_url?: string | null;
            state?: string | null;
            error_type?: string | null;
            error_origin?: string | null;
            submit_name?: string | null;
            md5?: string | null;
            sha1?: string | null;
            sha256?: string | null;
            sha512?: string | null;
            ssdeep?: string | null;
            imphash?: string | null;
            entrypoint?: string | null;
            entrypoint_section?: string | null;
            image_base?: string | null;
            subsystem?: string | null;
            image_file_characteristics?: string[];
            dll_characteristics?: string[];
            major_os_version?: number | null;
            minor_os_version?: number | null;
            av_detect?: number | null;
            vx_family?: string | null;
            url_analysis?: boolean | null;
            /** Format: date-time */
            analysis_start_time?: string | null;
            threat_score?: number | null;
            interesting?: boolean | null;
            threat_level?: number | null;
            verdict?: string | null;
            certificates?: components["schemas"]["Certificate"][];
            is_certificates_valid?: boolean | null;
            certificates_validation_message?: string | null;
            domains?: string[];
            compromised_hosts?: string[];
            hosts?: string[];
            total_network_connections?: number | null;
            total_processes?: number | null;
            total_signatures?: number | null;
            extracted_files?: components["schemas"]["ExtractedFile"][];
            file_metadata?: components["schemas"]["FileMetadata"] | null;
            processes?: components["schemas"]["Process"][];
            mitre_attcks?: components["schemas"]["MitreAttckSignature"][];
            /**
             * @deprecated
             * @description moved to exec_parameters
             */
            network_mode?: string;
            signatures?: components["schemas"]["Signature"][];
            /** @description this object is only present for detonations, is always null for quick scans */
            detonation_parameters?: components["schemas"]["DetonationParameters"] | null;
            classification_tags?: string[];
            tags?: string[];
            /** @description Contains latest twenty elements */
            submissions?: components["schemas"]["Submission"][];
            /** @description This values are populated only in summary endpoint, in search responses this will always be empty */
            machine_learning_models?: components["schemas"]["MachineLearningModel"][];
            crowdstrike_ai?: components["schemas"]["CrowdStrikeAi"] | null;
            warnings?: string[];
        };
        SampleTermsSearch: {
            search_terms?: components["schemas"]["KeyStringValue"][];
            count?: number;
            result?: components["schemas"]["SampleSearch"][];
        };
        SampleVerdict: {
            job_id?: string | null;
            environment_id?: number | null;
            state?: string | null;
            error_type?: string | null;
            error_origin?: string | null;
            sha256?: string | null;
            verdict?: string | null;
        };
        ScanBforeAi: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            percent?: number | null;
        };
        ScanCleanDns: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            reports_count?: number | null;
            reports?: components["schemas"]["CleanDnsReport"][];
        };
        ScanCriminalIp: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            percent?: number | null;
        };
        ScanCrowdStrikeMl: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            percent?: number | null;
            /** @description populated for default privileges or higher */
            anti_virus_results?: components["schemas"]["AntiVirusResult"][];
        };
        ScanMetadefender: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            total?: number | null;
            positives?: number | null;
            percent?: number | null;
            /** @description populated only for default privileges or higher */
            anti_virus_results?: components["schemas"]["AntiVirusResult"][];
        };
        ScanScamAdviser: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            percent?: number | null;
        };
        ScanUrlScanIo: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            percent?: number | null;
        };
        ScanVipre: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            percent?: number | null;
        };
        ScanVirusTotal: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            total?: number | null;
            positives?: number | null;
            percent?: number | null;
        };
        Scanner: {
            name?: string;
            /** @description Quick Scan status presented at the UI. Includes 'whitelisted' status. */
            status?: string;
            /** @description The original Quick Scan status. Excludes 'whitelisted' status. */
            statusRaw?: string;
            error_message?: string | null;
            progress?: number;
            total?: number | null;
            positives?: number | null;
            percent?: number | null;
            /** @description populated in some endpoints and only for default privileges or higher */
            anti_virus_results?: components["schemas"]["AntiVirusResult"][];
        };
        Scanners: {
            crowdstrike_ml?: components["schemas"]["ScanCrowdStrikeMl"] | null;
            metadefender?: components["schemas"]["ScanMetadefender"] | null;
            virustotal?: components["schemas"]["ScanVirusTotal"] | null;
            urlscan_io?: components["schemas"]["ScanUrlScanIo"] | null;
            scam_adviser?: components["schemas"]["ScanScamAdviser"] | null;
            clean_dns?: components["schemas"]["ScanCleanDns"] | null;
            bfore_ai?: components["schemas"]["ScanBforeAi"] | null;
            criminal_ip?: components["schemas"]["ScanCriminalIp"] | null;
            vipre?: components["schemas"]["ScanVipre"] | null;
        };
        SearchByHash: {
            sha256s?: string[];
            reports?: components["schemas"]["SearchByHashReport"][];
        };
        SearchByHashReport: {
            id?: string | null;
            environment_id?: number | null;
            environment_description?: string | null;
            state?: string | null;
            error_type?: string | null;
            error_origin?: string | null;
            verdict?: string | null;
        };
        Signature: {
            threat_level?: number | null;
            threat_level_human?: string | null;
            category?: string | null;
            identifier?: string | null;
            type?: number | null;
            relevance?: number | null;
            name?: string | null;
            description?: string | null;
            origin?: string | null;
            attck_id?: string | null;
            capec_id?: string | null;
            attck_id_wiki?: string | null;
        };
        Submission: {
            submission_id?: string | null;
            filename?: string | null;
            url?: string | null;
            /** Format: date-time */
            created_at?: string | null;
        };
        SubmissionQuota: {
            detonation?: components["schemas"]["QuotaOverall"];
            quick_scan?: components["schemas"]["QuotaOverall"];
        };
        SubmissionStatus: {
            job_id?: string | null;
            submission_id?: string | null;
            environment_id?: number | null;
            sha256?: string | null;
        };
        SystemStats: {
            total_submissions?: number;
            total_samples?: number;
            interesting_files_size?: number;
            interesting_files?: components["schemas"]["InterestingFiles"][];
            malicious_reports_size?: number;
            malicious_reports?: components["schemas"]["MaliciousReport"][];
            file_type_distribution_size?: number;
            file_type_distribution?: components["schemas"]["KeyIntValue"][];
            environment_id_distribution_size?: number;
            environment_id_distribution?: components["schemas"]["KeyIntValue"][];
            tags_distribution_size?: number;
            tags_distribution?: components["schemas"]["KeyIntValue"][];
            recent_comments?: components["schemas"]["RecentComment"][];
            behaviour_indicators?: number;
            total_yara_rules?: number;
        };
        UrlSubmissionStatus: components["schemas"]["SubmissionStatus"] & {
            submission_type?: string | null;
        };
        User: {
            id?: string;
            email?: string;
            name?: string;
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
    c1eed959af43228c83ebf43554f3c541: {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["DailyFeed"];
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
    "90ffc0d89757c30cda41531e26c3daac": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DetonationDailyFeed"][];
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
    "6f846a8bc0bc73e905408f2e6da577a7": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuickScanDailyFeed"][];
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
    "5e583bcbee466842da56ec9dbe819664": {
        parameters: {
            query?: never;
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
                    /** @description Submission limits and current usage */
                    "Submission-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    /** @description Quick Scan limits and current usage */
                    "Quick-Scan-Limits"?: string;
                    /** @description Sample Download limits and current usage */
                    "Sample-Download-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Key"];
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
    a638983ab386e3f17ede1ed9644220a8: {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["SubmissionQuota"];
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
    "9981be6445da2c7e117a48dbc551f5f6": {
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
    cb21128a1fd6a0bfa882774482d1473d: {
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
    "052627a17af8cc6ae5240f4684040902": {
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
                    "application/json": components["schemas"]["OverviewSummary"];
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
    f0861f681445a6b6dd6f1b9964cee1b8: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description SHA256 for download */
                sha256: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    /** @description Sample Download limits and current usage */
                    "Sample-Download-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/gzip": unknown;
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
    "04c731564495f3770c5d2e5d9971ecb2": {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["QuickScanService"];
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
    "711bd2a6c5b9f2b4c34e8af6554274e3": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /**
                     * @description Type of scan, please see /quick-scan/state to see available scanners
                     * @enum {string}
                     */
                    scan_type: "all" | "all_lookup" | "all_scan" | "lookup_ha" | "scan_crowdstrike_ml" | "scan_metadefender";
                    /** @description File to submit */
                    file: Record<string, never>;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    /** @description Quick Scan limits and current usage */
                    "Quick-Scan-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuickScan"];
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
    "458f96cf9b737894c0a7bd60f6e3f183": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /**
                     * @description Type of scan, please see /quick-scan/state to see available scanners
                     * @enum {string}
                     */
                    scan_type: "all" | "all_lookup" | "all_scan" | "lookup_ha" | "lookup_cleandns" | "lookup_bforeai" | "scan_crowdstrike_ml" | "scan_metadefender" | "scan_urlscanio" | "scan_scamadviser" | "scan_criminalip" | "scan_vipre";
                    /** @description website's url or url with file to submit */
                    url: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    /** @description Quick Scan limits and current usage */
                    "Quick-Scan-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuickScan"];
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
    "1caeced3764dc67b0fc84b86cc9d5d74": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /**
                     * @description Type of scan, please see /quick-scan/state to see available scanners
                     * @enum {string}
                     */
                    scan_type: "all" | "all_lookup" | "all_scan" | "lookup_ha" | "scan_crowdstrike_ml" | "scan_metadefender";
                    /** @description url of file to submit */
                    url: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    /** @description Quick Scan limits and current usage */
                    "Quick-Scan-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuickScan"];
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
    c1764f8d9ba84c12fedb7f73915ab380: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /**
                     * @description Type of scan, please see /quick-scan/state to see available scanners
                     * @enum {string}
                     */
                    scan_type: "all" | "all_lookup" | "all_scan" | "lookup_ha" | "lookup_cleandns" | "lookup_bforeai" | "scan_urlscanio" | "scan_scamadviser" | "scan_criminalip" | "scan_vipre";
                    /** @description url for analyze */
                    url: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    /** @description Quick Scan limits and current usage */
                    "Quick-Scan-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuickScan"];
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
    "8b094dc6a7b763bfd4e25911ed8af72c": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description id of scan */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    /** @description Quick Scan limits and current usage */
                    "Quick-Scan-Limits"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["QuickScan"];
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
    a73895c4bd896396a8f59a02f49cac3b: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description SHA256 of the sample you want to report */
                    sha256: string;
                    /** @description Report reason */
                    reason: string;
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
                    "application/json": components["schemas"]["ReportAbuseNew"];
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
    d97c84ba3099decb501ba37e993ad225: {
        parameters: {
            query?: {
                /** @description Page if there more results than we can display in one request */
                page?: number;
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
                    "application/json": components["schemas"]["ReportAbuseFeed"];
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
    "654b1757059fe1083aa8ad456fb6b8c0": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    fe428721a2d007320558f6c1322015b7: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": string[];
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
    "610507c03f2fd279e8bf7de42eb1b78b": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": components["schemas"]["MemoryDump"][];
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
    a5ac630a36de6338b24cd231aae1b017: {
        parameters: {
            query: {
                /** @description Memory Dump Filename */
                filename: string;
            };
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": components["schemas"]["MemoryDumpExtractedStrings"];
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
    "39f01edd97d1aa8b83c7f339ccf58025": {
        parameters: {
            query: {
                /** @description Memory Dump Filename */
                filename: string;
            };
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": components["schemas"]["MemoryDumpHexDump"];
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
    efae3cf1c0edae0a3d48749f6897a022: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description Instead of gz file you can download this file using gzip encoding if your client supports it (recommended), **NOTE:** in Swagger GUI this can be overwritten by browser
                 * @example gzip
                 */
                "accept-encoding"?: string;
            };
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    dd971989a7f758edc5d1c9a7f5fde421: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description Instead of gz file you can download this file using gzip encoding if your client supports it (recommended), **NOTE:** in Swagger GUI this can be overwritten by browser
                 * @example gzip
                 */
                "accept-encoding"?: string;
            };
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    c674755592ec02c64ad836ae12d6d7bf: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/gzip": unknown;
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
    e01f9d5e492cbc72369f56397488365b: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description Instead of gz file you can download this file using gzip encoding if your client supports it (recommended), **NOTE:** in Swagger GUI this can be overwritten by browser
                 * @example gzip
                 */
                "accept-encoding"?: string;
            };
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    a9bc4ff2646b8ebd3e94b21c17f32f37: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": components["schemas"]["SampleState"];
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
    b7bf5dba3bdd7e12a97034ad679b7358: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": components["schemas"]["SampleSummary"];
                };
            };
            /** @description response for container files */
            410: {
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
                    "application/json": components["schemas"]["SampleGone"];
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
    a692386204ede603328741f7b08e225a: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description List of ids. Allowed format: jobId, md5:environmentId, sha1:environmentId or sha256:environmentId */
                    "hashes[]": string[];
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
                    "application/json": components["schemas"]["SampleSummary"][];
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
    "7e872c46c1a5638b701b09cc68e03565": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
                /**
                 * @description Type of requested content, available types:
                 *          - **xml** - The XML report as application/xml content and *.gz compressed.
                 *          - **json** - The JSON report as application/json content
                 *          - **html** - The HTML report as text/html content and *.gz compressed
                 *          - **pdf** - The PDF report as application/pdf content
                 *          - **maec** - The MAEC (4.1) report as application/xml content
                 *          - **stix** - The STIX report as application/xml content
                 *          - **misp** - The MISP XML report as application/xml content
                 *          - **misp-json** - The MISP JSON report as application/json content
                 *          - **openioc** - The OpenIOC (1.1) report as application/xml content
                 *          - **bin** - The binary sample as application/octet-stream and *.gz compressed. Note: if the file was uploaded with 'no_share_vt' (i.e. not shared), this might fail.
                 *          - **crt** - The binary sample certificate file (is available) as application/octet-stream content
                 *          - **memory** - The process memory dump files as application/octet-stream and zip compressed.
                 *          - **pcap** - The PCAP network traffic capture file as application/octet-stream and *.gz compressed.
                 */
                type: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    db2dc105afde92f2df0d322b61143a5e: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
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
                    "application/json": components["schemas"]["SampleScreenshot"][];
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
    "5d4fc0a422e9da082903f9ccf9b9bad1": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
                /** @description SHA256 of dropped file */
                hash: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description success response */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    e718eaeb76a4ebfd4781995e894d7cec: {
        parameters: {
            query?: never;
            header?: {
                /**
                 * @description Instead of gz file you can download this file using gzip encoding if your client supports it (recommended), **NOTE:** in Swagger GUI this can be overwritten by browser
                 * @example gzip
                 */
                "accept-encoding"?: string;
            };
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
                /** @description SHA256 of dropped file */
                hash: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    ec44d43bdb74f2d7921a770ae549e81d: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    "62a8676fdd00f35e04945f2f0b4ad07d": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description Id in one of format: 'jobId' or 'sha256:environmentId' */
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description content of requested file */
            200: {
                headers: {
                    /** @description Name of file */
                    "Vx-Filename"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/octet-stream": unknown;
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
    b972462c6d0d664b328b10b9e91da4c9: {
        parameters: {
            query: {
                /** @description MD5, SHA1, SHA256 or SHA512 */
                hash: string;
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
                    "application/json": components["schemas"]["SearchByHash"];
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
    "0197a6ff29eab44bf4d18d45bb67aedb": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description MD5, SHA1 or SHA256 */
                    hash: string;
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
                    "application/json": components["schemas"]["SampleSummary"][];
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
    "2f3268b2522562c9d49936fae22ea6c7": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description List of hashes. Allowed type: MD5, SHA1 or SHA256 */
                    "hashes[]": string[];
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
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
                    "application/json": components["schemas"]["SampleSummary"][];
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
    "5d7230cfa76c541818188ff3911bb6a2": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /**
                     * @description Filename e.g. invoice.exe
                     * @default
                     */
                    filename?: string;
                    /**
                     * @description Filetype e.g. docx <p>Available options: 64bits, 7zip, ace, android, applescript, appx, arj, ascx, ashx, asmx, asp, asp.net, aspx, assembly, autoit, bat, bmp, bzip, chrome, cmd, coldfusion, com, compressed, csv, data, dmg, doc, docker, docx, elf, email, empty, executable, extension, flash, gif, gzip, heif, html, hwp, hwpx, ico, image, img, imgimage, innosetup, iqy, isoimage, jar, java, javascript, jpg, json, jsp, jspx, keras, library, lnk, lzh, macho, macro, memorydump, mlmodel, msc, mshelp, msi, msix, msixbundle, native, neexe, numpy, office, onenote, opendirectory, outlook, pdf, pedll, peexe, perl, php, pickle, png, powershell, ppam, ppt, pptx, ps, pub, python, pytorch, rar, rtf, ruby, script, sct, sfx, sh, svg, sylk, tar, tensorrt, text, tiff, unknown, url, vba, vbe, vbs, webp, wim, wsf, xar, xls, xlsx, xml, xz, zip</p>
                     * @default
                     */
                    filetype?: string;
                    /**
                     * @description Filetype description e.g. PE32 executable
                     * @default
                     */
                    filetype_desc?: string;
                    /**
                     * @description Environment Id
                     * @default
                     */
                    env_id?: string;
                    /**
                     * @description Country (3 digit ISO) e.g. swe
                     * @default
                     */
                    country?: string;
                    /**
                     * @description Verdict e.g. 1 <p>Available options: <strong>1</strong> 'whitelisted', <strong>2</strong> 'no verdict', <strong>3</strong> 'no specific threat', <strong>4</strong> 'suspicious', <strong>5</strong> 'malicious'</p>
                     * @default
                     */
                    verdict?: number;
                    /**
                     * @description AV Multiscan range e.g. 50-70 (min 0, max 100)
                     * @default
                     */
                    av_detect?: string;
                    /**
                     * @description AV Family Substring e.g. nemucod
                     * @default
                     */
                    vx_family?: string;
                    /**
                     * @description Hashtag e.g. ransomware
                     * @default
                     */
                    tag?: string;
                    /**
                     * Format: datetime
                     * @description Date from in format: 'Y-m-d H:i' e.g. 2018-09-28 15:30
                     * @default
                     */
                    date_from?: string;
                    /**
                     * Format: datetime
                     * @description Date to in format: 'Y-m-d H:i' e.g. 2018-09-28 15:30
                     * @default
                     */
                    date_to?: string;
                    /**
                     * @description Port e.g. 8080
                     * @default
                     */
                    port?: number;
                    /**
                     * @description Host e.g. 192.168.0.1
                     * @default
                     */
                    host?: string;
                    /**
                     * @description Domain e.g. checkip.dyndns.org
                     * @default
                     */
                    domain?: string;
                    /**
                     * @description HTTP Request Substring e.g. google
                     * @default
                     */
                    url?: string;
                    /**
                     * @description Similar Samples e.g. \<sha256\>
                     * @default
                     */
                    similar_to?: string;
                    /**
                     * @description Sample Context e.g. \<sha256\>
                     * @default
                     */
                    context?: string;
                    /** @default  */
                    imp_hash?: string;
                    /** @default  */
                    ssdeep?: string;
                    /** @default  */
                    authentihash?: string;
                    /**
                     * @description Uses MITRE ATT&CK&reg; Tactic. Please check they website to get current Tactics
                     * @default
                     */
                    uses_tactic?: string;
                    /**
                     * @description Uses MITRE ATT&CK&reg; Technique. Please check they website to get current Techniques
                     * @default
                     */
                    uses_technique?: string;
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
                    "application/json": components["schemas"]["SampleTermsSearch"][];
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
    e306d626e3fbbe3f10982ff88251b2b7: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "multipart/form-data": {
                    /** @description file to submit */
                    file: Record<string, never>;
                    /** @description Environment ID. Available environments ID: <strong>430</strong>: 'macOS Tahoe (ARM64)', <strong>330</strong>: 'Linux (Ubuntu 24.04, 64 bit)', <strong>200</strong>: 'Android Static Analysis', <strong>160</strong>: 'Windows 10 64 bit', <strong>140</strong>: 'Windows 11 64 bit', <strong>120</strong>: 'Windows 7 64 bit', <strong>110</strong>: 'Windows 7 32 bit (HWP Support)', <strong>100</strong>: 'Windows 7 32 bit' */
                    environment_id: number;
                    /**
                     * @description Optional custom runtime action script. Available runtime scripts: **default**, **default_maxantievasion**, **default_randomfiles**, **default_randomtheme**, **default_openie**
                     * @default
                     */
                    action_script?: string;
                    /**
                     * @description When set to 'true', will set all experimental anti-evasion options of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    experimental_anti_evasion?: boolean;
                    /**
                     * @description When set to 'true', will set the in-depth script logging engine of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    script_logging?: boolean;
                    /**
                     * @description When set to 'true', will allow experimental anti-evasion options of the Kernelmode Monitor that tamper with the input sample. Default: false
                     * @default
                     */
                    input_sample_tampering?: boolean;
                    /**
                     * @description Deprecated, please use 'network_settings' instead
                     * @default
                     */
                    tor_enabled_analysis?: boolean;
                    /**
                     * @description Deprecated, please use 'network_settings' instead
                     * @default
                     */
                    offline_analysis?: boolean;
                    /**
                     * @description Network settings, by the default, fully operating network is set. <p>Available options: <strong>default</strong>:  'Fully operating network', <strong>tor</strong>:  'Route network traffic via TOR network', <strong>simulated</strong>:  'Simulate network traffic during the analysis'</p>
                     * @default
                     */
                    network_settings?: string;
                    /**
                     * @description Optional Email address that may be associated with the submission for notification
                     * @default
                     */
                    email?: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional custom date/time that can be set for the analysis system. Expected format: yyyy-MM-dd HH:mm
                     * @default
                     */
                    custom_date_time?: string;
                    /**
                     * @description Optional commandline that should be passed to the analysis file
                     * @default
                     */
                    custom_cmd_line?: string;
                    /**
                     * @description Optional runtime duration (in seconds)
                     * @default
                     */
                    custom_run_time?: number;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                    /**
                     * @description Optional priority value ranging from 1-10. 1-4 indicates low priority processing, 5-10 standard priority processing. The default is standard priority (5).
                     * @default
                     */
                    priority?: number;
                    /**
                     * @description Optional document password that will be used to fill-in Adobe/Office password prompts
                     * @default
                     */
                    document_password?: string;
                    /**
                     * @description Optional system environment value. The value is provided in the format: name: value
                     * @default
                     */
                    environment_variable?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Submission limits and current usage */
                    "Submission-Limits\""?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionStatus"];
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
    "22e1723d4cec5c9b20d50715e4e5de8f": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description url for analyze or url of file to submit */
                    url: string;
                    /** @description Environment ID. Available environments ID: <strong>430</strong>: 'macOS Tahoe (ARM64)', <strong>330</strong>: 'Linux (Ubuntu 24.04, 64 bit)', <strong>200</strong>: 'Android Static Analysis', <strong>160</strong>: 'Windows 10 64 bit', <strong>140</strong>: 'Windows 11 64 bit', <strong>120</strong>: 'Windows 7 64 bit', <strong>110</strong>: 'Windows 7 32 bit (HWP Support)', <strong>100</strong>: 'Windows 7 32 bit' */
                    environment_id: number;
                    /**
                     * @description Optional custom runtime action script. Available runtime scripts: **default**, **default_maxantievasion**, **default_randomfiles**, **default_randomtheme**, **default_openie**
                     * @default
                     */
                    action_script?: string;
                    /**
                     * @description When set to 'true', will set all experimental anti-evasion options of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    experimental_anti_evasion?: boolean;
                    /**
                     * @description When set to 'true', will set the in-depth script logging engine of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    script_logging?: boolean;
                    /**
                     * @description When set to 'true', will allow experimental anti-evasion options of the Kernelmode Monitor that tamper with the input sample. Default: false
                     * @default
                     */
                    input_sample_tampering?: boolean;
                    /**
                     * @description Deprecated, please use 'network_settings' instead
                     * @default
                     */
                    tor_enabled_analysis?: boolean;
                    /**
                     * @description Deprecated, please use 'network_settings' instead
                     * @default
                     */
                    offline_analysis?: boolean;
                    /**
                     * @description Network settings, by the default, fully operating network is set. <p>Available options: <strong>default</strong>:  'Fully operating network', <strong>tor</strong>:  'Route network traffic via TOR network', <strong>simulated</strong>:  'Simulate network traffic during the analysis'</p>
                     * @default
                     */
                    network_settings?: string;
                    /**
                     * @description Optional Email address that may be associated with the submission for notification
                     * @default
                     */
                    email?: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional custom date/time that can be set for the analysis system. Expected format: yyyy-MM-dd HH:mm
                     * @default
                     */
                    custom_date_time?: string;
                    /**
                     * @description Optional commandline that should be passed to the analysis file
                     * @default
                     */
                    custom_cmd_line?: string;
                    /**
                     * @description Optional runtime duration (in seconds)
                     * @default
                     */
                    custom_run_time?: number;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis. Ignored unless url contains a file
                     * @default
                     */
                    submit_name?: string;
                    /**
                     * @description Optional priority value ranging from 1-10. 1-4 indicates low priority processing, 5-10 standard priority processing. The default is standard priority (5).
                     * @default
                     */
                    priority?: number;
                    /**
                     * @description Optional document password that will be used to fill-in Adobe/Office password prompts. Ignored unless url contains a file
                     * @default
                     */
                    document_password?: string;
                    /**
                     * @description Optional system environment value. The value is provided in the format: name: value
                     * @default
                     */
                    environment_variable?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Submission limits and current usage */
                    "Submission-Limits\""?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionStatus"];
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
    d23ebbf65a2b6ea472053d3478acdbaa: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description url of file to submit */
                    url: string;
                    /** @description Environment ID. Available environments ID: <strong>430</strong>: 'macOS Tahoe (ARM64)', <strong>330</strong>: 'Linux (Ubuntu 24.04, 64 bit)', <strong>200</strong>: 'Android Static Analysis', <strong>160</strong>: 'Windows 10 64 bit', <strong>140</strong>: 'Windows 11 64 bit', <strong>120</strong>: 'Windows 7 64 bit', <strong>110</strong>: 'Windows 7 32 bit (HWP Support)', <strong>100</strong>: 'Windows 7 32 bit' */
                    environment_id: number;
                    /**
                     * @description Optional custom runtime action script. Available runtime scripts: **default**, **default_maxantievasion**, **default_randomfiles**, **default_randomtheme**, **default_openie**
                     * @default
                     */
                    action_script?: string;
                    /**
                     * @description When set to 'true', will set all experimental anti-evasion options of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    experimental_anti_evasion?: boolean;
                    /**
                     * @description When set to 'true', will set the in-depth script logging engine of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    script_logging?: boolean;
                    /**
                     * @description When set to 'true', will allow experimental anti-evasion options of the Kernelmode Monitor that tamper with the input sample. Default: false
                     * @default
                     */
                    input_sample_tampering?: boolean;
                    /**
                     * @description When set to 'true', will route the network traffic for the analysis via TOR (if properly configured on the server). Default: false
                     * @default
                     */
                    tor_enabled_analysis?: boolean;
                    /**
                     * @description When set to “true”, will disable outbound network traffic for the guest VM (takes precedence over ‘tor_enabled_analysis’ if both are provided). Default: false
                     * @default
                     */
                    offline_analysis?: boolean;
                    /**
                     * @description Optional Email address that may be associated with the submission for notification
                     * @default
                     */
                    email?: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional custom date/time that can be set for the analysis system. Expected format: yyyy-MM-dd HH:mm
                     * @default
                     */
                    custom_date_time?: string;
                    /**
                     * @description Optional commandline that should be passed to the analysis file
                     * @default
                     */
                    custom_cmd_line?: string;
                    /**
                     * @description Optional runtime duration (in seconds)
                     * @default
                     */
                    custom_run_time?: number;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                    /**
                     * @description Optional priority value ranging from 1-10. 1-4 indicates low priority processing, 5-10 standard priority processing. The default is standard priority (5).
                     * @default
                     */
                    priority?: number;
                    /**
                     * @description Optional document password that will be used to fill-in Adobe/Office password prompts
                     * @default
                     */
                    document_password?: string;
                    /**
                     * @description Optional system environment value. The value is provided in the format: name: value
                     * @default
                     */
                    environment_variable?: string;
                    /**
                     * @description Optional interactivity timeout. Total time that VM will be active (in seconds). Default: 900s
                     * @default
                     */
                    interactivity_timeout?: number;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Submission limits and current usage */
                    "Submission-Limits\""?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionStatus"];
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
    "10980b93e5209ab3dde97d651c2fc503": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description url for analyze */
                    url: string;
                    /** @description Environment ID. Available environments ID: <strong>430</strong>: 'macOS Tahoe (ARM64)', <strong>330</strong>: 'Linux (Ubuntu 24.04, 64 bit)', <strong>200</strong>: 'Android Static Analysis', <strong>160</strong>: 'Windows 10 64 bit', <strong>140</strong>: 'Windows 11 64 bit', <strong>120</strong>: 'Windows 7 64 bit', <strong>110</strong>: 'Windows 7 32 bit (HWP Support)', <strong>100</strong>: 'Windows 7 32 bit' */
                    environment_id: number;
                    /**
                     * @description Optional custom runtime action script. Available runtime scripts: **default**, **default_maxantievasion**, **default_randomfiles**, **default_randomtheme**, **default_openie**
                     * @default
                     */
                    action_script?: string;
                    /**
                     * @description When set to 'true', will set all experimental anti-evasion options of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    experimental_anti_evasion?: boolean;
                    /**
                     * @description When set to 'true', will set the in-depth script logging engine of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    script_logging?: boolean;
                    /**
                     * @description When set to 'true', will allow experimental anti-evasion options of the Kernelmode Monitor that tamper with the input sample. Default: false
                     * @default
                     */
                    input_sample_tampering?: boolean;
                    /**
                     * @description When set to 'true', will route the network traffic for the analysis via TOR (if properly configured on the server). Default: false
                     * @default
                     */
                    tor_enabled_analysis?: boolean;
                    /**
                     * @description When set to “true”, will disable outbound network traffic for the guest VM (takes precedence over ‘tor_enabled_analysis’ if both are provided). Default: false
                     * @default
                     */
                    offline_analysis?: boolean;
                    /**
                     * @description Optional Email address that may be associated with the submission for notification
                     * @default
                     */
                    email?: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional custom date/time that can be set for the analysis system. Expected format: yyyy-MM-dd HH:mm
                     * @default
                     */
                    custom_date_time?: string;
                    /**
                     * @description Optional commandline that should be passed to the analysis file
                     * @default
                     */
                    custom_cmd_line?: string;
                    /**
                     * @description Optional runtime duration (in seconds)
                     * @default
                     */
                    custom_run_time?: number;
                    /**
                     * @description Optional priority value ranging from 1-10. 1-4 indicates low priority processing, 5-10 standard priority processing. The default is standard priority (5).
                     * @default
                     */
                    priority?: number;
                    /**
                     * @description Optional system environment value. The value is provided in the format: name: value
                     * @default
                     */
                    environment_variable?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Submission limits and current usage */
                    "Submission-Limits\""?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionStatus"];
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
    e7a13bfd6ebcdc403f13efd8aa5f9bcc: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description Url to check */
                    url: string;
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
                    "application/json": components["schemas"]["Hash"];
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
    e2bce91701a469c9751d5a63da2869d9: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description Id of the report from which the file should be analyzed. Id in one of format: 'jobId' or 'sha256:environmentId' */
                    id: string;
                    /** @description SHA256 of dropped file for analyze */
                    file_hash: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Submission limits and current usage */
                    "Submission-Limits\""?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionStatus"];
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
    "024cceff2dd2ddfad6a74251aad3b846": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description ID of quick scan to convert */
                id: string;
            };
            cookie?: never;
        };
        /** @description input parameters */
        requestBody?: {
            content: {
                "application/x-www-form-urlencoded": {
                    /** @description Environment ID. Available environments ID: <strong>430</strong>: 'macOS Tahoe (ARM64)', <strong>330</strong>: 'Linux (Ubuntu 24.04, 64 bit)', <strong>200</strong>: 'Android Static Analysis', <strong>160</strong>: 'Windows 10 64 bit', <strong>140</strong>: 'Windows 11 64 bit', <strong>120</strong>: 'Windows 7 64 bit', <strong>110</strong>: 'Windows 7 32 bit (HWP Support)', <strong>100</strong>: 'Windows 7 32 bit' */
                    environment_id: number;
                    /**
                     * @description Optional custom runtime action script. Available runtime scripts: **default**, **default_maxantievasion**, **default_randomfiles**, **default_randomtheme**, **default_openie**
                     * @default
                     */
                    action_script?: string;
                    /**
                     * @description When set to 'true', will set all experimental anti-evasion options of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    experimental_anti_evasion?: boolean;
                    /**
                     * @description When set to 'true', will set the in-depth script logging engine of the Kernelmode Monitor. Default: false
                     * @default
                     */
                    script_logging?: boolean;
                    /**
                     * @description When set to 'true', will allow experimental anti-evasion options of the Kernelmode Monitor that tamper with the input sample. Default: false
                     * @default
                     */
                    input_sample_tampering?: boolean;
                    /**
                     * @description Deprecated, please use 'network_settings' instead
                     * @default
                     */
                    tor_enabled_analysis?: boolean;
                    /**
                     * @description Deprecated, please use 'network_settings' instead
                     * @default
                     */
                    offline_analysis?: boolean;
                    /**
                     * @description Network settings, by the default, fully operating network is set. <p>Available options: <strong>default</strong>:  'Fully operating network', <strong>tor</strong>:  'Route network traffic via TOR network', <strong>simulated</strong>:  'Simulate network traffic during the analysis'</p>
                     * @default
                     */
                    network_settings?: string;
                    /**
                     * @description Optional Email address that may be associated with the submission for notification
                     * @default
                     */
                    email?: string;
                    /**
                     * @description Optional comment text that may be associated with the submission/sample (Note: you can use #tags here)
                     * @default
                     */
                    comment?: string;
                    /**
                     * @description Optional custom date/time that can be set for the analysis system. Expected format: yyyy-MM-dd HH:mm
                     * @default
                     */
                    custom_date_time?: string;
                    /**
                     * @description Optional commandline that should be passed to the analysis file
                     * @default
                     */
                    custom_cmd_line?: string;
                    /**
                     * @description Optional runtime duration (in seconds)
                     * @default
                     */
                    custom_run_time?: number;
                    /**
                     * @description Optional 'submission name' field that will be used for file type detection and analysis
                     * @default
                     */
                    submit_name?: string;
                    /**
                     * @description Optional priority value ranging from 1-10. 1-4 indicates low priority processing, 5-10 standard priority processing. The default is standard priority (5).
                     * @default
                     */
                    priority?: number;
                    /**
                     * @description Optional document password that will be used to fill-in Adobe/Office password prompts
                     * @default
                     */
                    document_password?: string;
                    /**
                     * @description Optional system environment value. The value is provided in the format: name: value
                     * @default
                     */
                    environment_variable?: string;
                };
            };
        };
        responses: {
            /** @description success response */
            201: {
                headers: {
                    /** @description Api limits and current usage */
                    "Api-Limits"?: string;
                    /** @description Submission limits and current usage */
                    "Submission-Limits\""?: string;
                    /** @description Current API version */
                    "Api-Version"?: string;
                    /** @description Current Webservice Version */
                    "Webservice-Version"?: string;
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SubmissionStatus"];
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
    "145769f29b3862d158e74b6ddda845f1": {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["InstanceVersion"];
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
    bd68b15f49c59048688402da2a9d5b90: {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["Environment"][];
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
    "13ea959829e5303a7aa453d5e74c503e": {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["ActionScript"][];
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
    "5e878cfdb239f874742add7b9c519b41": {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["SystemStats"];
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
    d373372cf33e493b15d9678972b68268: {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["Configuration"];
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
    "04ea6a4ccdb477857ab825ca8ca8f4f5": {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["IntValue"];
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
    "5a69498675db3f2db5cfdb50423feafb": {
        parameters: {
            query?: never;
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
                    "application/json": components["schemas"]["IntValue"];
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
}
