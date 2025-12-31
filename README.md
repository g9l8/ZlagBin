# ZlagBin

file and text hosting app that actually gives a damn about your privacy. Everything's encrypted before it hits the server, and you can make stuff disappear after someone reads it. Pretty neat, right?

## What's Cool About It

- **Vewy gud encryption** (AES-256-GCM if you wanna look into it if your retarded)
- **Actually looks good** - no ugly 90s interfaces here
- Share text or files, whatever you need
- **Markdown works** if you're into that
- Set stuff to expire (1 min to 7 days)
- **Burn after reading** - Mission Impossible style
- Lock it with a password if you want
- Drag and drop files like a normal human
- Copy links with one click

## Let's Get This Running

You'll need Node.js installed (v14 or newer) that's it

Just run these commands:

```bash
npm install --no-bin-links
npm start
```

Then open `http://localhost:7655`

Want it to auto-restart when you make changes? Install nodemon globally and use `npm run dev` instead.

## How to Use It

**For text:**
Hit the Text tab, paste your stuff, maybe turn on markdown if you want it pretty, set when it should expire (or not), decide if it should self-destruct after someone reads it, add a password if you're feeling paranoid, then hit upload then share if u wanna or not just to be a dick

**For files:**
Click the File tab, drag your file in (or browse if you like clicking), same deal with the expiry and burn-after-read options, upload, share the link n stuff again

## Security Features

### Encryption
- Uses AES-256-GCM (Galois/Counter Mode) encryption
- Each upload gets a unique encryption key
- Password-protected content uses scrypt key derivation
- Authentication tags prevent tampering

### Privacy
- No server-side logging of content
- Automatic cleanup of expired content
- Burn-after-reading ensures one-time access
- Files stored encrypted on disk

## Technical Stack

- **Backend**: Node.js, Express
- **Encryption**: Crypto (AES-256-GCM)
- **File Upload**: Multer
- **Scheduling**: node-schedule
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Markdown**: Marked.js

## API Stuff (If You Care)

`POST /api/upload/text` - Upload text with all the options
`POST /api/upload/file` - Upload files 
`GET /api/view/:id` - Get info about something
`POST /api/retrieve/:id` - Actually grab the content

## License

MIT - do whatever you want with it!

---

Built with luv by that nigga canni & some AI for the front end cuz i dont do front end bullshit
