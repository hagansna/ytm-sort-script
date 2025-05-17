import YouTubeMusic, { ITrackDetail } from "youtube-music-ts-api"
import * as fs from "fs";
import * as path from "path";

async function main(playlistName: string, cookieStr: string | null) {
    if (!cookieStr) {
        console.error("No cookie string provided. Please provide a cookie string using the --cookie flag or define one in an environment variable.");
        return;
    }
    const ytm = new YouTubeMusic()
    const ytma = await ytm.authenticate(cookieStr);
    const playlists = await ytma.getLibraryPlaylists();
    if (playlists) {
        const playlist = playlists.find((playlist) => playlist.name === playlistName);
        if (!playlist) {
            console.error(`Playlist "${playlistName}" not found.`);
            return;
        }
        const playlistId = playlist.id;
        if (!playlistId) {
            console.error(`Playlist "${playlistName}" does not have an ID.`);
            return;
        }
        console.log(`Found playlist: ${playlist.name} (${playlistId})`);
        const playlistDetails = await ytma.getPlaylist(playlistId);
        const originalTracks = playlistDetails.tracks;
        
        if (!originalTracks) {
            console.error(`Playlist "${playlistName}" does not have any tracks.`);
            return;
        }

        try {
            console.log("Saving backup of original playlist...");
            fs.writeFileSync(path.join(__dirname, "playlist_backup.json"), JSON.stringify(originalTracks))
            console.log("Backup saved to playlist_backup.json");
        } catch (error) {
            console.error(`Failed to save backup: ${error}`);
        }

        const removed = await ytma.removeTracksFromPlaylist(playlistId, ...originalTracks);
        if (removed) {
            console.log(`Removed tracks from playlist "${playlistName}".`);
        } else {
            console.error(`Failed to remove tracks from playlist "${playlistName}".`);
            return;
        }
        const tracks = originalTracks.sort((a: ITrackDetail, b: ITrackDetail) => {
            if (a.artists && b.artists) {
                const mainArtistA = a.artists[0]
                const mainArtistB = b.artists[0];
                if (mainArtistA.name && mainArtistB.name) {
                    return mainArtistA.name.localeCompare(mainArtistB.name);
                }
            }
            return 0;
        });
        if (!tracks) {
            console.error(`Failed to sort tracks for playlist "${playlistName}".`);
            return;
        }
        const addedPlaylist = await ytma.addTracksToPlaylist(playlistId, ...tracks);
        if (!addedPlaylist) {
            console.error(`Failed to add tracks to playlist "${playlistName}". Use playlist_backup.json to restore the original playlist.`);
            
        } else {
            console.log(`Added sorted tracks to playlist "${playlistName}"! Deleting backup...`);
            try {
                fs.unlinkSync(path.join(__dirname, "playlist_backup.json"));
                console.log("Backup deleted.");
            } catch (error) {
                console.error(`Failed to delete backup: ${error}`);
            }
        }
    }
    
}

const nameIndex = process.argv.indexOf("--name");
let playlistNameArg;
if (nameIndex > -1) {
    playlistNameArg = process.argv[nameIndex + 1];
}

const cookieIndex = process.argv.indexOf("--cookie");
let cookieStr;
if (cookieIndex > -1) {
    cookieStr = process.argv[cookieIndex + 1];
}

const playlistName = playlistNameArg || "Megs' Ultimate Playlist";
const cookie = cookieStr || process.env.YTM_COOKIE || null;

main(playlistName, cookie);