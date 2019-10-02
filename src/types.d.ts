declare module 'user-agents';

interface GalleryInsert {
    dir: string,
    title: string,
    original_title: string,
    length: number,
    hidden: boolean,
    hidden_reason?: string,
    category: string,
    url: string,
}

interface Gallery {
    id: number,
    dir: string,
    title: string,
    original_title?: string,
    length: number,
    hidden: boolean,
    hidden_reason?: string,
    category: string,
    url: string,
    created?: number,
    updated?: number,
    page_count?: number
}

interface Tag {
    name: string,
    group: string
}

interface Page {
    id_gallery: number,
    page_number: number,
    filename: string
}