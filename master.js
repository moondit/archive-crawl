var shelljs = require("shelljs");
var fs = require ("fs");
var os = require("os");
var path = require("path");
var shows = fs.readFileSync("./shows.txt", "utf8").split("\n").filter((show) => show.match(/archive.org/));
var commander = require("commander")
	.option("-p, --path [path]", "The directory that you want to save the files to", `${os.homedir()}/Downloads`)
	.option("-s, --shows [path]", "The supplied text file of archive shows that you want to download", "./shows.txt")
	.parse(process.argv);

function buildFolders(fullPath) {
	var foldersToCreate = fullPath.replace(commander.path, "").slice(1).split("/");
	var directory = commander.path;

	foldersToCreate.forEach((folder) => {
		directory = path.join(directory, folder);
		if (!fs.existsSync(directory)) {
			fs.mkdirSync(directory);
		}
	});
}

shows.forEach((show, showIndex, showArray) => {
	console.log(`\n\nProcessing ${showIndex + 1} of ${showArray.length + 1}...\n\n`);
	var artist = null;
	var date = null;
	var venue = null;
	var baseUrl = show.split("/").pop();
	var savedFile = null;
	var poster = null;
	var year = null;
	var responseHtml = shelljs.exec(`wget -qO- ${show}`).stdout;
	var tracks = `${responseHtml.split("Play('jw6',")[1].split("],")[0]}]`;
	
	responseHtml.match(/"title":"(\d+)\.\s(.+?)"/gi).forEach((match) => {
		var track = match.match(/(\d+)\. /)[1];
		var songTitle = match.match(/\. (.+)"/)[1].replace(/\\/, "");
		tracks[track] = songTitle;
	});

	responseHtml.replace(/itemprop="datePublished">(.+)<\/span>/, (match, concertDate) => {
		date = concertDate.replace(/-/g, ".");
		year = date.slice(0, 4);
	});

	responseHtml.replace(/\?query=venue.+"(\s.+)?>(.+)<\/a>/, (match, optionalCg, concertVenue) => {
		venue = concertVenue;
	});

	responseHtml.replace(/<span itemprop=\"creator\">(.+)<\/span>/, (match, concertArtist) => {
		artist = concertArtist;
	});

	responseHtml.replace(/link itemprop=\"image\" href=\"(.+\.(jpg|png).+)\"/, (match, concertPoster, extension) => {
		poster = concertPoster + extension;
	});

	responseHtml.replace(/Location<\/span>(?:.|\s)+?href=".+"\s+>(.+)<\/a>/, (match, concertLocation) => {
		location = concertLocation;
	});


	var folderName = `${date} ${venue}, ${location}`;
	var fullPath = path.join(commander.path, artist, year, folderName);	
	buildFolders(fullPath);

	if (poster) {
		var origImage = path.join(fullPath, "folder.jpg"); 
		var newImage = path.join(fullPath, "folder1.jpg"); 
		shelljs.exec(`wget "${poster}" -O "${origImage}"`);
		shelljs.exec(`ffmpeg -y -i "${origImage}" -qscale:v 2 -vf scale=500:-1 "${newImage}"`);
	

		var origImageSize = fs.statSync(origImage).size;
		var newImageSize = fs.statSync(newImage).size;

		if (origImageSize < newImageSize) {
			fs.unlinkSync(newImage);
		} else {
			fs.unlinkSync(origImage);
			fs.renameSync(newImage, origImage);
		}
	}

	JSON.parse(tracks).forEach((track, trackIndex, trackArray) => {
		var title = track.title.replace(/^\d+\.\s+/, "").replace(/(\/|\\)/g, "-");
		var trackNum = String(trackIndex + 1);
		trackNum = trackNum.length === 1 ? `0${trackNum}` : trackNum; 
		var outputTrack = `${trackNum} - ${title}.mp3`;
		var input = path.join(fullPath, track.orig);
		var output = path.join(fullPath, outputTrack);

		console.log(`\n\nProcessing track ${trackIndex + 1} of ${trackArray.length + 1}...\n\n`)
		shelljs.exec(`wget "https://archive.org/download/${baseUrl}/${track.orig}" -P "${fullPath}"`);

		shelljs.exec(`ffmpeg -i "${input}" -i "${origImage}" -map 0:a -codec:a libmp3lame -b:a 320k -metadata artist="${artist}" -metadata track="${trackNum}" -metadata date="${date.replace(".", "-")}" -metadata title="${title}" -metadata album="${date} ${venue}, ${location}" -map 1:v -c:v copy -metadata:s:v title="Album cover" -metadata:s:v comment="Cover (Front)" -id3v2_version 4 "${output}"`);
		fs.unlinkSync(input);
	});
});
