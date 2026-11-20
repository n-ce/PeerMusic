<script lang="ts">
    import { onMount } from "svelte";
    import type {
        MoodPlaylist,
        NodeData,
        NetworkNode,
        CategoriesData,
        CategoryChip,
        AggregatedAlbum,
        AggregatedArtist,
        SortMode,
        AppView,
        NodePlaybackMode,
    } from "./lib/types.ts";
    import CategoryCard from "./lib/CategoryCard.svelte";
    import PlaylistCard from "./lib/PlaylistCard.svelte";
    import TrackCard from "./lib/TrackCard.svelte";
    import RelatedNodeCard from "./lib/RelatedNodeCard.svelte";
    import NetworkNodeCard from "./lib/NetworkNodeCard.svelte";
    import AlbumCard from "./lib/AlbumCard.svelte";
    import ArtistCard from "./lib/ArtistCard.svelte";
    import HubBox from "./lib/HubBox.svelte";

    // Navigation State - Default starting page is 'landing' hub
    let currentView = $state<AppView>("landing");
    let selectedCategory = $state("chill");
    let selectedShelf = $state("all");
    let activeNodeId = $state<string>("");
    let playbackMode = $state<NodePlaybackMode>("song");

    let categoriesData = $state<CategoriesData | null>(null);
    let networkNodes = $state<NetworkNode[]>([]);
    let topAlbums = $state<AggregatedAlbum[]>([]);
    let topArtists = $state<AggregatedArtist[]>([]);
    let playlists = $state<MoodPlaylist[]>([]);
    let nodeData = $state<NodeData | null>(null);

    let loading = $state(true);
    let nodeLoading = $state(false);
    let scraping = $state(false);
    let searchQuery = $state("");
    let sortBy = $state<SortMode>("appearances");
    let statusMessage = $state("");

    const basePath = import.meta.env.BASE_URL.endsWith("/")
        ? import.meta.env.BASE_URL
        : `${import.meta.env.BASE_URL}/`;

    // Check if current selected category is a mood vs a genre
    const isMoodCategory = $derived.by(() => {
        if (!categoriesData) return true;
        return categoriesData.moods.some((m) => m.slug === selectedCategory);
    });

    // Current active category metadata
    const currentCategoryObj = $derived.by(() => {
        if (!categoriesData) return null;
        return (
            categoriesData.moods.find((m) => m.slug === selectedCategory) ||
            categoriesData.genres.find((g) => g.slug === selectedCategory) ||
            null
        );
    });

    const currentCategoryTitle = $derived.by(() => {
        if (currentCategoryObj) return currentCategoryObj.title;
        if (!selectedCategory) return "Category";
        return (
            selectedCategory.charAt(0).toUpperCase() +
            selectedCategory.slice(1).replace(/_/g, " ")
        );
    });

    // Top appearing nodes (only curated RDCLAK nodes with >1 appearances)
    const eligibleTopNodes = $derived.by(() => {
        return networkNodes.filter(
            (n) => !n.id.startsWith("PL") && n.appearances > 1,
        );
    });

    const displayedTopNodes = $derived.by(() => {
        if (!eligibleTopNodes.length) return [];
        if (!searchQuery.trim()) {
            return eligibleTopNodes;
        }
        const q = searchQuery.toLowerCase().trim();
        return eligibleTopNodes.filter(
            (n) =>
                n.title.toLowerCase().includes(q) ||
                n.id.toLowerCase().includes(q) ||
                n.moods.some((m) => m.toLowerCase().includes(q)) ||
                n.shelves.some((s) => s.toLowerCase().includes(q)),
        );
    });

    // Top Albums (only albums referenced across >1 nodes)
    const eligibleTopAlbums = $derived.by(() => {
        return topAlbums.filter((a) => a.nodeReferences > 1);
    });

    const displayedTopAlbums = $derived.by(() => {
        if (!eligibleTopAlbums.length) return [];
        if (!searchQuery.trim()) return eligibleTopAlbums.slice(0, 150);
        const q = searchQuery.toLowerCase().trim();
        return eligibleTopAlbums
            .filter(
                (a) =>
                    a.title.toLowerCase().includes(q) ||
                    a.artist.toLowerCase().includes(q) ||
                    (a.id && a.id.toLowerCase().includes(q)),
            )
            .slice(0, 150);
    });

    // Top Artists (only artists referenced across >1 nodes)
    const eligibleTopArtists = $derived.by(() => {
        return topArtists.filter((ar) => ar.nodeReferences > 1);
    });

    const displayedTopArtists = $derived.by(() => {
        if (!eligibleTopArtists.length) return [];
        if (!searchQuery.trim()) return eligibleTopArtists.slice(0, 150);
        const q = searchQuery.toLowerCase().trim();
        return eligibleTopArtists
            .filter(
                (ar) =>
                    ar.name.toLowerCase().includes(q) ||
                    (ar.id && ar.id.toLowerCase().includes(q)) ||
                    ar.albums.some((alb) => alb.toLowerCase().includes(q)),
            )
            .slice(0, 150);
    });

    // Extract unique shelf titles from curated playlists (excluding community PL playlists)
    const availableShelves = $derived.by(() => {
        const set = new Set<string>();
        for (const p of playlists) {
            if (p.playlistId.startsWith("PL")) continue;
            if (p.shelves && p.shelves.length) {
                p.shelves.forEach((s) => set.add(s));
            } else if (p.shelfTitle) {
                set.add(p.shelfTitle);
            }
        }
        return Array.from(set).sort();
    });

    // Filter categories on subpages
    const filteredMoods = $derived.by(() => {
        if (!categoriesData) return [];
        if (!searchQuery.trim()) return categoriesData.moods;
        const q = searchQuery.toLowerCase().trim();
        return categoriesData.moods.filter(
            (m) =>
                m.title.toLowerCase().includes(q) ||
                m.slug.toLowerCase().includes(q),
        );
    });

    const filteredGenres = $derived.by(() => {
        if (!categoriesData) return [];
        if (!searchQuery.trim()) return categoriesData.genres;
        const q = searchQuery.toLowerCase().trim();
        return categoriesData.genres.filter(
            (g) =>
                g.title.toLowerCase().includes(q) ||
                g.slug.toLowerCase().includes(q),
        );
    });

    // Filter & sort logic for playlists (community PL playlists excluded from display)
    const filteredPlaylists = $derived.by(() => {
        let list = playlists.filter((p) => !p.playlistId.startsWith("PL"));

        if (selectedShelf !== "all") {
            list = list.filter(
                (p) =>
                    p.shelfTitle === selectedShelf ||
                    (p.shelves && p.shelves.includes(selectedShelf)),
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            list = list.filter(
                (p) =>
                    p.playlistTitle.toLowerCase().includes(q) ||
                    p.shelfTitle.toLowerCase().includes(q) ||
                    p.playlistId.toLowerCase().includes(q) ||
                    (p.shelves &&
                        p.shelves.some((s) => s.toLowerCase().includes(q))),
            );
        }

        return [...list].sort((a, b) => {
            if (sortBy === "appearances") {
                if (b.appearances !== a.appearances) {
                    return b.appearances - a.appearances;
                }
                return a.firstAppearanceIndex - b.firstAppearanceIndex;
            }
            if (sortBy === "order") {
                return a.firstAppearanceIndex - b.firstAppearanceIndex;
            }
            if (sortBy === "title") {
                return a.playlistTitle.localeCompare(b.playlistTitle);
            }
            return 0;
        });
    });

    // Filter & search for node tracks
    const displayedNodeTracks = $derived.by(() => {
        if (!nodeData) return [];
        const sourceList =
            playbackMode === "song" ? nodeData.atvs : nodeData.omvs;
        if (!searchQuery.trim()) return sourceList;

        const q = searchQuery.toLowerCase().trim();
        return sourceList.filter(
            (t) =>
                t.title.toLowerCase().includes(q) ||
                t.author.toLowerCase().includes(q) ||
                t.id.toLowerCase().includes(q) ||
                (t.albumTitle && t.albumTitle.toLowerCase().includes(q)),
        );
    });

    // URL / History Routing Helper: Nodes are loaded with their IDs, NOT names in URL
    function buildHash(
        view: AppView,
        category: string = selectedCategory,
        shelf: string = selectedShelf,
        nodeId?: string,
    ): string {
        switch (view) {
            case "landing":
                return "#/";
            case "top-playlists":
                return "#/top-playlists";
            case "moods":
                return "#/moods";
            case "genres":
                return "#/genres";
            case "top-albums":
                return "#/top-albums";
            case "top-artists":
                return "#/top-artists";
            case "node":
                return `#/node/${nodeId || activeNodeId}`;
            case "playlists": {
                let path = `#/moods-and-genres/${category}`;
                if (shelf && shelf !== "all") {
                    path += `/${encodeURIComponent(shelf)}`;
                }
                return path;
            }
            default:
                return "#/";
        }
    }

    function navigate(
        view: AppView,
        category: string = selectedCategory,
        shelf: string = "all",
        nodeId?: string,
        push = true,
    ) {
        currentView = view;
        selectedCategory = category;
        selectedShelf = shelf;
        searchQuery = "";
        if (nodeId) {
            activeNodeId = nodeId;
        }

        const newHash = buildHash(view, category, shelf, nodeId);
        if (push && window.location.hash !== newHash) {
            window.history.pushState(
                { view, category, shelf, nodeId },
                "",
                newHash,
            );
        }

        if (view === "playlists") {
            loadCategoryPlaylists(category);
        } else if (view === "node" && nodeId) {
            loadNodeById(nodeId);
        }
    }

    async function loadCategoryPlaylists(slug: string) {
        selectedCategory = slug;
        loading = true;
        try {
            let res = await fetch(`${basePath}categories/${slug}.json`);
            if (!res.ok) {
                res = await fetch(`${basePath}moods/${slug}.json`);
            }
            if (!res.ok) {
                res = await fetch(`${basePath}genres/${slug}.json`);
            }
            if (res.ok) {
                playlists = await res.json();
                return;
            }

            if (slug === "chill") {
                const chillRes = await fetch(`${basePath}chill-playlists.json`);
                if (chillRes.ok) {
                    playlists = await chillRes.json();
                    return;
                }
            }

            const apiRes = await fetch(`/api/category/${slug}`);
            if (apiRes.ok) {
                const json = await apiRes.json();
                if (json.playlists) {
                    playlists = json.playlists;
                    return;
                }
            }

            statusMessage = `Could not load playlists for "${slug}"`;
        } catch (err: any) {
            statusMessage = `Error loading "${slug}": ${err?.message || "Network error"}`;
        } finally {
            loading = false;
        }
    }

    async function loadNodeById(cleanNodeId: string) {
        activeNodeId = cleanNodeId;
        if (nodeData?.playlistId === cleanNodeId && nodeData.atvs.length > 0) {
            return;
        }

        nodeLoading = true;
        try {
            const res = await fetch(`${basePath}nodes/${cleanNodeId}.json`);
            if (res.ok) {
                nodeData = await res.json();
                return;
            }

            if (cleanNodeId === "l2OjbOL4oVkkHE86UT6oQCNufuv8d0luQ") {
                const dsmRes = await fetch(
                    `${basePath}node-deep-sleep-meditation.json`,
                );
                if (dsmRes.ok) {
                    nodeData = await dsmRes.json();
                    return;
                }
            }

            const apiRes = await fetch(`/api/node/${cleanNodeId}`);
            if (apiRes.ok) {
                const json = await apiRes.json();
                if (json.data) {
                    nodeData = json.data;
                    statusMessage = `Loaded node: ${nodeData?.playlistTitle}`;
                    return;
                }
            }

            const known = networkNodes.find((n) => n.id === cleanNodeId);
            if (known) {
                nodeData = {
                    playlistId: known.id,
                    playlistTitle: known.title,
                    thumbnailId: known.thumbnailId,
                    atvs: [],
                    omvs: [],
                    relatedNodes: [],
                    communityPlaylistsScraped: 0,
                };
            } else {
                statusMessage = `Node ${cleanNodeId} not pre-scraped`;
            }
        } catch (err: any) {
            statusMessage = `Error loading node: ${err?.message || "Network error"}`;
        } finally {
            nodeLoading = false;
            setTimeout(() => {
                statusMessage = "";
            }, 3500);
        }
    }

    function syncFromUrl() {
        const hash = window.location.hash || "";
        if (!hash || hash === "#" || hash === "#/" || hash === "#/home") {
            currentView = "landing";
            selectedShelf = "all";
            return;
        }

        const cleanHash = hash.replace(/^#\/?/, "");
        const parts = cleanHash.split("/").filter(Boolean);

        // Path: #/node/:nodeId (nodes loaded by ID not name)
        if (parts[0] === "node" && parts[1]) {
            const cleanId = decodeURIComponent(parts[1]);
            currentView = "node";
            loadNodeById(cleanId);
            return;
        }

        // Subpage: #/top-playlists or #/nodes
        if (parts[0] === "top-playlists" || parts[0] === "nodes") {
            currentView = "top-playlists";
            return;
        }

        // Subpage: #/moods
        if (parts[0] === "moods") {
            currentView = "moods";
            return;
        }

        // Subpage: #/genres
        if (parts[0] === "genres") {
            currentView = "genres";
            return;
        }

        // Subpage: #/top-albums or #/albums
        if (parts[0] === "top-albums" || parts[0] === "albums") {
            currentView = "top-albums";
            return;
        }

        // Subpage: #/top-artists or #/artists
        if (parts[0] === "top-artists" || parts[0] === "artists") {
            currentView = "top-artists";
            return;
        }

        // Path: #/moods-and-genres/:categorySlug/:shelf?
        if (parts[0] === "moods-and-genres") {
            if (!parts[1]) {
                currentView = "landing";
                return;
            }
            const categorySlug = decodeURIComponent(parts[1]);
            const shelfPart = parts[2] ? decodeURIComponent(parts[2]) : "all";
            currentView = "playlists";
            selectedCategory = categorySlug;
            selectedShelf = shelfPart;
            loadCategoryPlaylists(categorySlug);
            return;
        }

        currentView = "landing";
        selectedShelf = "all";
    }

    function handleSelectCategory(cat: CategoryChip) {
        navigate("playlists", cat.slug, "all");
    }

    function handleSelectShelf(shelf: string) {
        navigate("playlists", selectedCategory, shelf);
    }

    function handleSelectNode(playlistId: string) {
        navigate("node", selectedCategory, selectedShelf, playlistId);
    }

    async function loadData() {
        loading = true;
        try {
            const [cRes, netRes, albRes, artRes] = await Promise.allSettled([
                fetch(`${basePath}categories.json`),
                fetch(`${basePath}nodes-network.json`),
                fetch(`${basePath}top-albums.json`),
                fetch(`${basePath}top-artists.json`),
            ]);

            if (cRes.status === "fulfilled" && cRes.value.ok) {
                categoriesData = await cRes.value.json();
            }
            if (netRes.status === "fulfilled" && netRes.value.ok) {
                networkNodes = await netRes.value.json();
            }
            if (albRes.status === "fulfilled" && albRes.value.ok) {
                topAlbums = await albRes.value.json();
            }
            if (artRes.status === "fulfilled" && artRes.value.ok) {
                topArtists = await artRes.value.json();
            }
        } catch (err) {
            console.warn("Fallback loading error:", err);
        } finally {
            loading = false;
            syncFromUrl();
        }
    }

    async function triggerScrape() {
        scraping = true;
        if (currentView === "playlists") {
            statusMessage = `Scraping YouTube Music ${currentCategoryTitle} shelves...`;
            try {
                const res = await fetch(`/api/category/${selectedCategory}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.playlists) {
                        playlists = data.playlists;
                        statusMessage = `Successfully refreshed ${playlists.length} playlists for ${currentCategoryTitle}`;
                    }
                } else {
                    statusMessage = "Scrape request failed, check server logs";
                }
            } catch {
                statusMessage = "Network error while scraping";
            }
        } else if (currentView === "node" && activeNodeId) {
            statusMessage = `Scraping node ${activeNodeId} & related items...`;
            try {
                const res = await fetch(`/api/node/${activeNodeId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.data) {
                        nodeData = data.data;
                        statusMessage = `Node refreshed: ${nodeData?.atvs.length} ATVs & ${nodeData?.omvs.length} OMVs`;
                    }
                } else {
                    statusMessage = "Node scrape request failed";
                }
            } catch {
                statusMessage = "Network error while scraping node";
            }
        } else {
            statusMessage = "Scraping all categories & network...";
            try {
                const res = await fetch("/api/scrape");
                if (res.ok) {
                    await loadData();
                    statusMessage = "Network refreshed!";
                }
            } catch {
                statusMessage = "Scrape request failed";
            }
        }

        scraping = false;
        setTimeout(() => {
            statusMessage = "";
        }, 3500);
    }

    onMount(() => {
        loadData();

        const onPopState = () => {
            syncFromUrl();
        };

        window.addEventListener("popstate", onPopState);
        window.addEventListener("hashchange", onPopState);

        return () => {
            window.removeEventListener("popstate", onPopState);
            window.removeEventListener("hashchange", onPopState);
        };
    });
</script>

<div class="app-layout">
    <!-- Minimal Monochrome Header -->
    <header class="header">
        <div class="header-left">
            <div class="brand">
                <h1 class="logo">
                    <button
                        type="button"
                        class="logo-btn"
                        onclick={() => navigate("landing")}
                    >
                        PeerMusic
                    </button>
                </h1>
            </div>
            <p class="subtitle">
                {#if currentView === "landing"}
                    Curated Nodes Network • Moods & Genres Catalog
                {:else if currentView === "top-playlists"}
                    Top Curated Playlists & Nodes ({eligibleTopNodes.length} multi-referenced)
                {:else if currentView === "moods"}
                    Moods & Moments ({categoriesData?.moods.length || 0} categories)
                {:else if currentView === "genres"}
                    Music Genres ({categoriesData?.genres.length || 0} categories)
                {:else if currentView === "top-albums"}
                    Top Referenced Albums ({eligibleTopAlbums.length} multi-referenced)
                {:else if currentView === "top-artists"}
                    Top Referenced Artists ({eligibleTopArtists.length} multi-referenced)
                {:else if currentView === "playlists"}
                    Moods & Genres › {currentCategoryTitle} Playlists
                {:else if nodeData}
                    Node: {nodeData.playlistTitle}
                {/if}
            </p>
        </div>

        <div class="header-right">
            <button
                type="button"
                class="action-btn"
                disabled={scraping}
                onclick={triggerScrape}
                title="Live scrape from YouTube Music InnerTube"
            >
                <span class="btn-icon" class:spin={scraping}>
                    <i class="gg-redo"></i>
                </span>
                <span>{scraping ? "Scraping..." : "Live Scrape"}</span>
            </button>
        </div>
    </header>

    <!-- File Browser Style Navigation Bar: Back/Forward + Interactive Breadcrumbs -->
    <nav class="browser-nav-bar" aria-label="Directory navigation">
        <div class="history-controls">
            <button
                type="button"
                class="nav-icon-btn"
                onclick={() => window.history.back()}
                title="Back"
                aria-label="Go back"
            >
                <i class="gg-arrow-left"></i>
            </button>

            <button
                type="button"
                class="nav-icon-btn"
                onclick={() => window.history.forward()}
                title="Forward"
                aria-label="Go forward"
            >
                <i class="gg-arrow-right"></i>
            </button>
        </div>

        <!-- Navigable Breadcrumb Trail like a file browser -->
        <ol class="breadcrumb-trail">
            <li class="crumb-item">
                <button
                    type="button"
                    class="crumb-link"
                    class:current={currentView === "landing"}
                    onclick={() => navigate("landing")}
                    title="Go to Home"
                >
                    Home
                </button>
            </li>

            {#if currentView === "top-playlists"}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item current-leaf" aria-current="page">
                    <span>Top Playlists</span>
                </li>
            {:else if currentView === "moods"}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item current-leaf" aria-current="page">
                    <span>Moods</span>
                </li>
            {:else if currentView === "genres"}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item current-leaf" aria-current="page">
                    <span>Genres</span>
                </li>
            {:else if currentView === "top-albums"}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item current-leaf" aria-current="page">
                    <span>Top Albums</span>
                </li>
            {:else if currentView === "top-artists"}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item current-leaf" aria-current="page">
                    <span>Top Artists</span>
                </li>
            {:else if currentView === "playlists"}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item">
                    <button
                        type="button"
                        class="crumb-link"
                        onclick={() => navigate(isMoodCategory ? "moods" : "genres")}
                        title={`Go to ${isMoodCategory ? "Moods" : "Genres"}`}
                    >
                        {isMoodCategory ? "Moods" : "Genres"}
                    </button>
                </li>
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item">
                    <button
                        type="button"
                        class="crumb-link"
                        class:current={selectedShelf === "all"}
                        onclick={() =>
                            navigate("playlists", selectedCategory, "all")}
                        title={`Go to ${currentCategoryTitle} playlists`}
                    >
                        {currentCategoryTitle}
                    </button>
                </li>

                {#if selectedShelf !== "all"}
                    <li class="crumb-separator" aria-hidden="true">/</li>
                    <li class="crumb-item current-leaf" aria-current="page">
                        <span>{selectedShelf}</span>
                    </li>
                {/if}
            {:else if currentView === "node" && nodeData}
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item">
                    <button
                        type="button"
                        class="crumb-link"
                        onclick={() => navigate("top-playlists")}
                        title="Go to Top Playlists"
                    >
                        Nodes
                    </button>
                </li>
                <li class="crumb-separator" aria-hidden="true">/</li>
                <li class="crumb-item current-leaf" aria-current="page">
                    <span>{nodeData.playlistTitle}</span>
                </li>
            {/if}
        </ol>
    </nav>

    <!-- Search & Controls Bar (displayed on subpages) -->
    {#if currentView !== "landing"}
        <section class="controls-bar" aria-label="Filters and sorting">
            <div class="search-box">
                <i class="gg-search search-icon"></i>
                <input
                    type="search"
                    placeholder={currentView === "top-playlists"
                        ? "Filter top playlists & nodes by title, ID, or mood..."
                        : currentView === "moods"
                          ? "Filter moods by title..."
                          : currentView === "genres"
                            ? "Filter genres by title..."
                            : currentView === "top-albums"
                              ? "Search top albums by title or artist..."
                              : currentView === "top-artists"
                                ? "Search top artists by name or album..."
                                : currentView === "playlists"
                                  ? `Filter ${currentCategoryTitle} playlists by title, shelf, or ID...`
                                  : `Search ${playbackMode === "song" ? "songs" : "videos"} by title or artist...`}
                    bind:value={searchQuery}
                    class="search-input"
                />
                {#if searchQuery}
                    <button
                        type="button"
                        class="clear-btn"
                        onclick={() => (searchQuery = "")}
                        aria-label="Clear search"
                    >
                        <i class="gg-close"></i>
                    </button>
                {/if}
            </div>

            {#if currentView === "playlists"}
                <div class="filter-actions">
                    <!-- Shelf Dropdown Filter -->
                    <div class="select-wrapper">
                        <label for="shelf-select" class="control-label">
                            Shelf:
                        </label>
                        <select
                            id="shelf-select"
                            value={selectedShelf}
                            onchange={(e) =>
                                navigate(
                                    "playlists",
                                    selectedCategory,
                                    (e.target as HTMLSelectElement).value,
                                )}
                            class="custom-select"
                        >
                            <option value="all">
                                All Shelves ({availableShelves.length})
                            </option>
                            {#each availableShelves as shelf}
                                <option value={shelf}>{shelf}</option>
                            {/each}
                        </select>
                    </div>

                    <!-- Sort Mode Dropdown -->
                    <div class="select-wrapper">
                        <label for="sort-select" class="control-label">Sort:</label>
                        <select
                            id="sort-select"
                            bind:value={sortBy}
                            class="custom-select"
                        >
                            <option value="appearances">
                                By appearances (most frequent)
                            </option>
                            <option value="order">
                                By appearance order (initial)
                            </option>
                            <option value="title">By title (A–Z)</option>
                        </select>
                    </div>
                </div>
            {:else if currentView === "top-playlists"}
                <div class="categories-count-badge">
                    <span>{displayedTopNodes.length} Curated Nodes</span>
                </div>
            {:else if currentView === "moods"}
                <div class="categories-count-badge">
                    <span>{filteredMoods.length} Moods</span>
                </div>
            {:else if currentView === "genres"}
                <div class="categories-count-badge">
                    <span>{filteredGenres.length} Genres</span>
                </div>
            {:else if currentView === "top-albums"}
                <div class="categories-count-badge">
                    <span>{displayedTopAlbums.length} Top Albums</span>
                </div>
            {:else if currentView === "top-artists"}
                <div class="categories-count-badge">
                    <span>{displayedTopArtists.length} Top Artists</span>
                </div>
            {:else if currentView === "node"}
                <div class="ranking-rule-badge">
                    {#if playbackMode === "song"}
                        <span>
                            Ranking: Main Playlist ATVs ➔ Community ATVs by appearances
                        </span>
                    {:else}
                        <span>Video Mode: 16:9 Widescreen OMVs</span>
                    {/if}
                </div>
            {/if}
        </section>
    {/if}

    <!-- Node Header Banner when in Node View -->
    {#if currentView === "node" && nodeData}
        <section class="node-banner">
            <div class="node-info">
                <h2 class="node-title">{nodeData.playlistTitle}</h2>
                <div class="node-meta-row">
                    <span class="node-chip">ID: {nodeData.playlistId}</span>
                    <span class="node-chip">
                        {nodeData.communityPlaylistsScraped} Community Playlists Harvested
                    </span>
                    {#if nodeData.relatedNodes?.length}
                        <span class="node-chip">
                            {nodeData.relatedNodes.length} Related Nodes
                        </span>
                    {/if}
                </div>
            </div>

            <!-- Mode Selector: Song Mode (ATV) vs Video Mode (OMV) -->
            <div
                class="mode-selector"
                role="radiogroup"
                aria-label="Playback mode"
            >
                <button
                    type="button"
                    class="mode-btn"
                    class:active={playbackMode === "song"}
                    onclick={() => (playbackMode = "song")}
                    title="Audio-only tracks (ATV) ranked by main playlist precedence and appearances"
                >
                    <i class="gg-music"></i>
                    <span>Song Mode ({nodeData.atvs.length} ATVs)</span>
                </button>

                <button
                    type="button"
                    class="mode-btn"
                    class:active={playbackMode === "video"}
                    onclick={() => (playbackMode = "video")}
                    title="Music videos (OMV) stored separately for video mode (16:9 thumbnails)"
                >
                    <i class="gg-film"></i>
                    <span>Video Mode ({nodeData.omvs.length} OMVs)</span>
                </button>
            </div>
        </section>

        <!-- Related Nodes Section (Discovered RDCLAK5uy nodes) -->
        {#if nodeData.relatedNodes && nodeData.relatedNodes.length > 0}
            <section
                class="related-nodes-section"
                aria-label="Related curated nodes"
            >
                <div class="related-header">
                    <h3 class="related-title">
                        Related Nodes ({nodeData.relatedNodes.length})
                    </h3>
                    <span class="related-desc">
                        Official curated nodes discovered via search graph
                        (click to explore)
                    </span>
                </div>

                <div class="related-nodes-grid">
                    {#each nodeData.relatedNodes as rNode (rNode.id)}
                        <RelatedNodeCard
                            node={rNode}
                            onSelect={handleSelectNode}
                        />
                    {/each}
                </div>
            </section>
        {/if}
    {/if}

    <!-- Active Shelf Filter Banner (if in playlists view and filtering by shelf) -->
    {#if currentView === "playlists" && selectedShelf !== "all"}
        <div class="shelf-filter-banner">
            <div class="shelf-filter-info">
                <span class="shelf-label">Shelf:</span>
                <strong class="shelf-name">{selectedShelf}</strong>
                <span class="shelf-count">
                    ({filteredPlaylists.length} playlists)
                </span>
            </div>
            <button
                type="button"
                class="clear-shelf-btn"
                onclick={() => navigate("playlists", selectedCategory, "all")}
                title={`Clear shelf filter and show all ${currentCategoryTitle} playlists`}
            >
                <i class="gg-close"></i>
                <span>Show All Shelves</span>
            </button>
        </div>
    {/if}

    <!-- Status Notification Banner -->
    {#if statusMessage}
        <div class="status-banner" role="status">
            <span>{statusMessage}</span>
        </div>
    {/if}

    <!-- Main View -->
    <main class="content-container">
        {#if loading || nodeLoading}
            <div class="loading-state">
                <div class="spinner"></div>
                <p>
                    {nodeLoading
                        ? "Harvesting and loading node..."
                        : "Loading catalog data..."}
                </p>
            </div>
        {:else if currentView === "landing"}
            <!-- ============================================================= -->
            <!-- MAIN LANDING HUB: 5 PROMINENT BOXES ONLY                       -->
            <!-- ============================================================= -->
            <div class="landing-container">
                <div class="hub-intro">
                    <h2 class="hub-heading">Explore PeerMusic Catalog</h2>
                    <p class="hub-subheading">
                        Select a section below to load its dedicated view.
                    </p>
                </div>

                <div class="hub-grid">
                    <!-- 1. Top Playlists (Curated Nodes) -->
                    <HubBox
                        title="Top Playlists"
                        description="Official curated playlists appearing across multiple moods & shelves (>1× references)."
                        count={eligibleTopNodes.length ? eligibleTopNodes.length.toLocaleString() : "0"}
                        countLabel="Curated Nodes"
                        iconClass="gg-play-list"
                        tag="Multi-Referenced"
                        onClick={() => navigate("top-playlists")}
                    />

                    <!-- 2. Genres -->
                    <HubBox
                        title="Genres"
                        description="Explore 38 genre categories and official curated shelves."
                        count={categoriesData?.genres.length || 38}
                        countLabel="Categories"
                        iconClass="gg-music"
                        tag="Styles"
                        onClick={() => navigate("genres")}
                    />

                    <!-- 3. Moods -->
                    <HubBox
                        title="Moods"
                        description="Explore 11 mood categories and official curated shelves."
                        count={categoriesData?.moods.length || 11}
                        countLabel="Categories"
                        iconClass="gg-sun"
                        tag="Moments"
                        onClick={() => navigate("moods")}
                    />

                    <!-- 4. Top Albums -->
                    <HubBox
                        title="Top Albums"
                        description="Most referenced albums across curated mood & genre nodes (>1× references)."
                        count={eligibleTopAlbums.length ? eligibleTopAlbums.length.toLocaleString() : "0"}
                        countLabel="Multi-Referenced Albums"
                        iconClass="gg-album"
                        tag="Aggregated"
                        onClick={() => navigate("top-albums")}
                    />

                    <!-- 5. Top Artists -->
                    <HubBox
                        title="Top Artists"
                        description="Most referenced artists across curated mood & genre nodes (>1× references)."
                        count={eligibleTopArtists.length ? eligibleTopArtists.length.toLocaleString() : "0"}
                        countLabel="Multi-Referenced Artists"
                        iconClass="gg-user"
                        tag="Aggregated"
                        onClick={() => navigate("top-artists")}
                    />
                </div>
            </div>

        {:else if currentView === "top-playlists"}
            <!-- ============================================================= -->
            <!-- SUBPAGE: TOP CURATED NODES GRID                               -->
            <!-- ============================================================= -->
            <section
                class="category-section"
                aria-label="Most appearing curated nodes across categories"
            >
                <div class="section-header">
                    <div class="section-header-titles">
                        <h2 class="section-title">Top Curated Playlists & Nodes</h2>
                        <span class="section-subtitle">
                            Curated nodes appearing across multiple categories & shelves (>1 appearances, ranked by occurrences)
                        </span>
                    </div>
                    <span class="section-count">
                        {displayedTopNodes.length} nodes
                    </span>
                </div>

                <div class="top-nodes-grid">
                    {#each displayedTopNodes as node, idx (node.id)}
                        <NetworkNodeCard
                            {node}
                            rank={idx + 1}
                            onSelect={handleSelectNode}
                        />
                    {/each}
                </div>
            </section>

        {:else if currentView === "moods"}
            <!-- ============================================================= -->
            <!-- SUBPAGE: MOODS GRID                                           -->
            <!-- ============================================================= -->
            <section class="category-section" aria-label="Moods and moments">
                <div class="section-header">
                    <div class="section-header-titles">
                        <h2 class="section-title">Moods & Moments</h2>
                        <span class="section-subtitle">
                            Browse shelves and curated playlists by mood or activity
                        </span>
                    </div>
                    <span class="section-count">
                        {filteredMoods.length} moods
                    </span>
                </div>

                <div class="category-grid">
                    {#each filteredMoods as mood (mood.slug)}
                        <CategoryCard
                            category={mood}
                            type="mood"
                            onSelect={handleSelectCategory}
                        />
                    {/each}
                </div>
            </section>

        {:else if currentView === "genres"}
            <!-- ============================================================= -->
            <!-- SUBPAGE: GENRES GRID                                          -->
            <!-- ============================================================= -->
            <section class="category-section" aria-label="Musical genres">
                <div class="section-header">
                    <div class="section-header-titles">
                        <h2 class="section-title">Music Genres</h2>
                        <span class="section-subtitle">
                            Browse shelves and curated playlists by musical style
                        </span>
                    </div>
                    <span class="section-count">
                        {filteredGenres.length} genres
                    </span>
                </div>

                <div class="category-grid">
                    {#each filteredGenres as genre (genre.slug)}
                        <CategoryCard
                            category={genre}
                            type="genre"
                            onSelect={handleSelectCategory}
                        />
                    {/each}
                </div>
            </section>

        {:else if currentView === "top-albums"}
            <!-- ============================================================= -->
            <!-- SUBPAGE: TOP REFERENCED ALBUMS                                -->
            <!-- ============================================================= -->
            <section class="category-section" aria-label="Top referenced albums">
                <div class="section-header">
                    <div class="section-header-titles">
                        <h2 class="section-title">Top Referenced Albums</h2>
                        <span class="section-subtitle">
                            Aggregated from harvested tracks across curated mood & genre nodes (>1 node references)
                        </span>
                    </div>
                    <span class="section-count">
                        {displayedTopAlbums.length} albums
                    </span>
                </div>

                {#if displayedTopAlbums.length === 0}
                    <div class="empty-state">
                        <p class="empty-title">No albums found</p>
                        <p class="empty-subtitle">Try adjusting your search query.</p>
                    </div>
                {:else}
                    <div class="albums-grid">
                        {#each displayedTopAlbums as album, idx (album.id || `${album.title}-${album.artist}`)}
                            <AlbumCard {album} rank={idx + 1} />
                        {/each}
                    </div>
                {/if}
            </section>

        {:else if currentView === "top-artists"}
            <!-- ============================================================= -->
            <!-- SUBPAGE: TOP REFERENCED ARTISTS                               -->
            <!-- ============================================================= -->
            <section class="category-section" aria-label="Top referenced artists">
                <div class="section-header">
                    <div class="section-header-titles">
                        <h2 class="section-title">Top Referenced Artists</h2>
                        <span class="section-subtitle">
                            Aggregated from harvested tracks across curated mood & genre nodes (>1 node references)
                        </span>
                    </div>
                    <span class="section-count">
                        {displayedTopArtists.length} artists
                    </span>
                </div>

                {#if displayedTopArtists.length === 0}
                    <div class="empty-state">
                        <p class="empty-title">No artists found</p>
                        <p class="empty-subtitle">Try adjusting your search query.</p>
                    </div>
                {:else}
                    <div class="artists-grid">
                        {#each displayedTopArtists as artist, idx (artist.id || artist.name)}
                            <ArtistCard {artist} rank={idx + 1} />
                        {/each}
                    </div>
                {/if}
            </section>

        {:else if currentView === "playlists"}
            <!-- ============================================================= -->
            <!-- SUBPAGE: CATEGORY PLAYLISTS GRID                              -->
            <!-- ============================================================= -->
            {#if filteredPlaylists.length === 0}
                <div class="empty-state">
                    <p class="empty-title">No playlists found</p>
                    <p class="empty-subtitle">
                        Try adjusting your search query or selected shelf filter.
                    </p>
                    <button
                        type="button"
                        class="reset-btn"
                        onclick={() => {
                            searchQuery = "";
                            navigate("playlists", selectedCategory, "all");
                        }}
                    >
                        Reset Filters
                    </button>
                </div>
            {:else}
                <div class="grid">
                    {#each filteredPlaylists as playlist (playlist.playlistId)}
                        <PlaylistCard
                            {playlist}
                            onSelectNode={handleSelectNode}
                            onSelectShelf={handleSelectShelf}
                        />
                    {/each}
                </div>
            {/if}

        {:else}
            <!-- ============================================================= -->
            <!-- SUBPAGE: NODE TRACKS (SONGS / VIDEOS)                         -->
            <!-- ============================================================= -->
            {#if !nodeData}
                <div class="empty-state">
                    <p class="empty-title">Node not loaded</p>
                    <button
                        type="button"
                        class="reset-btn"
                        onclick={triggerScrape}
                    >
                        Scrape Node Now
                    </button>
                </div>
            {:else if displayedNodeTracks.length === 0}
                <div class="empty-state">
                    <p class="empty-title">No tracks available yet</p>
                    {#if nodeData.atvs.length === 0 && nodeData.omvs.length === 0}
                        <p class="empty-subtitle">
                            This node has not been harvested into local cache yet.
                        </p>
                        <button
                            type="button"
                            class="reset-btn"
                            onclick={triggerScrape}
                        >
                            Live Scrape Node Now
                        </button>
                    {:else}
                        <button
                            type="button"
                            class="reset-btn"
                            onclick={() => (searchQuery = "")}
                        >
                            Clear Filter
                        </button>
                    {/if}
                </div>
            {:else}
                <div class="tracks-list">
                    {#each displayedNodeTracks as track (track.id)}
                        <TrackCard {track} mode={playbackMode} />
                    {/each}
                </div>
            {/if}
        {/if}
    </main>

    <!-- Minimal Monochrome Footer -->
    <footer class="footer">
        <div class="footer-content">
            <span>
                PeerMusic • Minimal Monochrome System Theme • Atkinson Hyperlegible Next Variable • css.gg
            </span>
            <span class="footer-meta">
                {#if currentView === "landing"}
                    5 Exploration Hubs • {eligibleTopNodes.length} Nodes (>1×) • {eligibleTopAlbums.length} Albums (>1×) • {eligibleTopArtists.length} Artists (>1×)
                {:else if currentView === "top-playlists"}
                    {eligibleTopNodes.length} Curated Network Nodes (>1× appearances)
                {:else if currentView === "moods" && categoriesData}
                    {categoriesData.moods.length} Mood Categories
                {:else if currentView === "genres" && categoriesData}
                    {categoriesData.genres.length} Genre Categories
                {:else if currentView === "top-albums"}
                    {eligibleTopAlbums.length} Multi-Referenced Albums (>1×)
                {:else if currentView === "top-artists"}
                    {eligibleTopArtists.length} Multi-Referenced Artists (>1×)
                {:else if currentView === "playlists"}
                    Moods & Genres / {currentCategoryTitle} • {filteredPlaylists.length} / {playlists.length} Playlists
                {:else if nodeData}
                    Node {nodeData.playlistId} • {nodeData.atvs.length} ATVs • {nodeData.omvs.length} OMVs • {nodeData.relatedNodes?.length || 0} Related Nodes
                {/if}
            </span>
        </div>
    </footer>
</div>

<style>
    .app-layout {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        max-width: 1440px;
        margin: 0 auto;
        padding: 24px 24px 40px;
        gap: 18px;
    }

    @media (max-width: 768px) {
        .app-layout {
            padding: 16px 16px 32px;
            gap: 14px;
        }
    }

    /* Header */
    .header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 16px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--border);
        flex-wrap: wrap;
    }

    .header-left {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .logo {
        font-size: 26px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 750;
        letter-spacing: -0.03em;
        color: var(--text);
    }

    .logo-btn {
        all: unset;
        cursor: pointer;
        color: inherit;
    }

    .subtitle {
        font-size: 13px;
        color: var(--text-secondary);
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .action-btn {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 7px 14px;
        border-radius: 6px;
        background: var(--text);
        color: var(--bg);
        border: 1px solid var(--text);
        font-size: 13px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        cursor: pointer;
        transition:
            opacity 0.15s ease,
            transform 0.15s ease;
    }

    .action-btn:hover:not(:disabled) {
        opacity: 0.9;
        transform: translateY(-1px);
    }

    .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .spin {
        animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }

    /* Browser Nav Bar */
    .browser-nav-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
        overflow-x: auto;
        scrollbar-width: thin;
    }

    .history-controls {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;
        border-right: 1px solid var(--border);
        padding-right: 8px;
    }

    .nav-icon-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 26px;
        height: 26px;
        border-radius: 4px;
        color: var(--text-muted);
        transition:
            color 0.15s ease,
            background 0.15s ease;
    }

    .nav-icon-btn:hover {
        color: var(--text);
        background: var(--card-bg);
    }

    .breadcrumb-trail {
        all: unset;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        white-space: nowrap;
        list-style: none;
    }

    .crumb-item {
        display: inline-flex;
        align-items: center;
    }

    .crumb-link {
        all: unset;
        cursor: pointer;
        color: var(--text-secondary);
        padding: 2px 6px;
        border-radius: 4px;
        transition:
            color 0.12s ease,
            background 0.12s ease;
    }

    .crumb-link:hover {
        color: var(--text);
        background: var(--card-bg);
    }

    .crumb-link.current {
        color: var(--text);
        font-variation-settings: "wght" 650;
    }

    .crumb-separator {
        color: var(--text-muted);
        font-size: 12px;
        user-select: none;
    }

    .current-leaf {
        color: var(--text);
        font-variation-settings: "wght" 650;
        padding: 2px 6px;
    }

    /* Controls Bar */
    .controls-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
    }

    .search-box {
        position: relative;
        flex: 1;
        min-width: 260px;
        display: flex;
        align-items: center;
    }

    .search-icon {
        position: absolute;
        left: 12px;
        color: var(--text-muted);
        pointer-events: none;
        font-size: 12px;
    }

    .search-input {
        width: 100%;
        padding: 8px 34px 8px 34px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        color: var(--text);
        font-size: 13.5px;
        font-family: inherit;
        outline: none;
        transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
    }

    .search-input:focus {
        border-color: var(--ring);
        box-shadow: 0 0 0 1px var(--ring);
    }

    .clear-btn {
        all: unset;
        position: absolute;
        right: 10px;
        cursor: pointer;
        color: var(--text-muted);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
        font-size: 10px;
    }

    .clear-btn:hover {
        color: var(--text);
    }

    .filter-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
    }

    .select-wrapper {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .control-label {
        font-size: 12px;
        color: var(--text-muted);
        font-variation-settings: "wght" 550;
    }

    .custom-select {
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid var(--border);
        background: var(--card-bg);
        color: var(--text);
        font-size: 13px;
        font-family: inherit;
        outline: none;
        cursor: pointer;
        transition: border-color 0.15s ease;
    }

    .custom-select:focus {
        border-color: var(--ring);
    }

    /* Landing Hub Grid */
    .landing-container {
        display: flex;
        flex-direction: column;
        gap: 20px;
    }

    .hub-intro {
        display: flex;
        flex-direction: column;
        gap: 4px;
    }

    .hub-heading {
        margin: 0;
        font-size: 20px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 750;
        color: var(--text);
        letter-spacing: -0.02em;
    }

    .hub-subheading {
        margin: 0;
        font-size: 13.5px;
        color: var(--text-secondary);
    }

    .hub-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 16px;
    }

    @media (max-width: 640px) {
        .hub-grid {
            grid-template-columns: 1fr;
            gap: 12px;
        }
    }

    /* Top Curated Nodes Grid */
    .section-header-titles {
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .section-subtitle {
        font-size: 12px;
        color: var(--text-muted);
        font-weight: 400;
    }

    .top-nodes-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 12px;
    }

    @media (max-width: 640px) {
        .top-nodes-grid {
            grid-template-columns: 1fr;
            gap: 10px;
        }
    }

    /* Categories Views */
    .category-section {
        display: flex;
        flex-direction: column;
        gap: 14px;
    }

    .section-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
        border-bottom: 1px solid var(--border-subtle);
        padding-bottom: 8px;
    }

    .section-title {
        font-size: 18px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        color: var(--text);
        letter-spacing: -0.02em;
    }

    .section-count {
        font-size: 12.5px;
        color: var(--text-muted);
        font-variant-numeric: tabular-nums;
    }

    .category-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 14px;
    }

    @media (max-width: 640px) {
        .category-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
    }

    .categories-count-badge {
        font-size: 12.5px;
        color: var(--text-secondary);
        background: var(--surface);
        border: 1px solid var(--border);
        padding: 6px 12px;
        border-radius: 6px;
        font-variant-numeric: tabular-nums;
    }

    /* Top Albums & Top Artists Grids */
    .albums-grid,
    .artists-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        gap: 12px;
    }

    @media (max-width: 768px) {
        .albums-grid,
        .artists-grid {
            grid-template-columns: 1fr;
            gap: 10px;
        }
    }

    /* Active Shelf Filter Banner */
    .shelf-filter-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        padding: 8px 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 13px;
        flex-wrap: wrap;
    }

    .shelf-filter-info {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .shelf-label {
        color: var(--text-muted);
    }

    .shelf-name {
        color: var(--text);
    }

    .shelf-count {
        color: var(--text-secondary);
    }

    .clear-shelf-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        color: var(--text-muted);
        font-size: 12px;
        padding: 2px 6px;
        border-radius: 4px;
        transition: color 0.15s ease;
    }

    .clear-shelf-btn:hover {
        color: var(--text);
    }

    /* Node Header Banner */
    .node-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        padding: 16px 20px;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 8px;
        flex-wrap: wrap;
    }

    .node-info {
        display: flex;
        flex-direction: column;
        gap: 6px;
    }

    .node-title {
        margin: 0;
        font-size: 20px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        letter-spacing: -0.02em;
        color: var(--text);
    }

    .node-meta-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .node-chip {
        font-family: var(--font-mono);
        font-size: 11px;
        color: var(--text-muted);
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        padding: 2px 8px;
        border-radius: 4px;
    }

    .mode-selector {
        display: inline-flex;
        align-items: center;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        padding: 3px;
        gap: 2px;
    }

    .mode-btn {
        all: unset;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 12px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 550;
        color: var(--text-muted);
        transition:
            background 0.15s ease,
            color 0.15s ease;
    }

    .mode-btn.active {
        background: var(--text);
        color: var(--bg);
        font-variation-settings: "wght" 650;
    }

    .ranking-rule-badge {
        font-family: var(--font-mono);
        font-size: 11px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 500;
        color: var(--text-muted);
        background: var(--surface);
        border: 1px solid var(--border-subtle);
        padding: 5px 10px;
        border-radius: 4px;
    }

    /* Related Nodes Section */
    .related-nodes-section {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 20px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 8px;
    }

    .related-header {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
    }

    .related-title {
        margin: 0;
        font-size: 14px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 700;
        color: var(--text);
    }

    .related-desc {
        font-size: 12px;
        color: var(--text-muted);
    }

    .related-nodes-grid {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
    }

    /* Status Notification Banner */
    .status-banner {
        display: flex;
        align-items: center;
        padding: 8px 14px;
        background: var(--surface);
        border: 1px solid var(--border);
        border-radius: 6px;
        font-size: 12.5px;
        color: var(--text);
    }

    /* Main Container & Playlists Grid */
    .content-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 16px;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        gap: 16px;
    }

    @media (max-width: 640px) {
        .grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
        }
    }

    /* Tracks List */
    .tracks-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    /* Loading & Empty States */
    .loading-state,
    .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 80px 20px;
        text-align: center;
        gap: 12px;
    }

    .spinner {
        width: 32px;
        height: 32px;
        border: 2px solid var(--border);
        border-top-color: var(--text);
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
    }

    .empty-title {
        font-size: 16px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 650;
        color: var(--text);
        margin: 0;
    }

    .empty-subtitle {
        font-size: 13px;
        color: var(--text-muted);
        margin: 0;
        max-width: 400px;
    }

    .reset-btn {
        all: unset;
        cursor: pointer;
        padding: 6px 14px;
        border-radius: 6px;
        background: var(--text);
        color: var(--bg);
        font-size: 13px;
        font-optical-sizing: auto;
        font-variation-settings: "wght" 600;
        margin-top: 4px;
    }

    /* Footer */
    .footer {
        padding-top: 20px;
        border-top: 1px solid var(--border);
        font-size: 11.5px;
        color: var(--text-muted);
    }

    .footer-content {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 10px;
    }

    .footer-meta {
        font-family: var(--font-mono);
        font-size: 11px;
    }
</style>
