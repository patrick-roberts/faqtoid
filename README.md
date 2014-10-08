faqtoid
=======

Automated Website Help System: FAQ, Tours/Walkthroughs, Email Form, Video Gallery

FAQtoid is a simple free all-in-one help system for your website or web application. It reduces your support costs by giving visitors the tools to help themselves.

* **FAQ with Live Search**  
Users see answers as they type.
* **Tours**  
Walk users through the parts of each page.
* **Video Gallery**
* **Smart Email Form**  
Handles crazy and junk messages. Automatically includes detailed information about your user, what they were trying to do, and any errors on the page.

[Live Demo](http://faqtoid.patrickroberts.ca/)

All without forcing your user to leave what they were doing and go to a separate isolated help page.

See what happened when your user had a problem. When the user emails you, FAQtoid includes the contents of all forms on the page, cookies, localStorage, previous page, browser version, OS, and more. Forward the information to your programmer and he can fix bugs in a fraction of the time.

Filters crazy messages. Blocks swear words, messages too short to be real, and duplicate messages. Converts all caps messages to normal punctuation.

Works on desktops, tablets, and phones. Compatible with all major browsers including IE8. Also works in Cordova/PhoneGap apps.

Easy to setup. No programming required for FAQs, tours, and videos. Simply paste HTML into your webpage. (The optional smart mail form unavoidably involves uploading one PHP script to your server.)

### Requires

jQuery: `<script src="//ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"></script>`

Even works with IE8. 

### Installation

1. Save the .js and .css files to your site.
2. Between the <head> tags of your webpage add: 
    `<script id=faqtoidScript src="faqtoid.js"></script>`
    `<link href="faqtoid.css" rel="stylesheet">`
3. In your HTML body add `<button class=showFaqtoid>Help</button>` or `<div id=inlineFaqtoid></div>`

### How to Show FAQtoid

`<button class=showFaqtoid>Help</button>` makes a button that shows the FAQtoid window. Or you can add `class=showFaqtoid` to make any element show FAQtoid when clicked.

You can also place FAQtoid [in the page](http://faqtoid.patrickroberts.ca/inline.html): `<div id=inlineFaqtoid></div>` Paste that anywhere in the body of a page.

### How to Add FAQs

Paste the following anywhere inside the `<body>...</body>` tags of your page. Repeat a `<div class=faq>...</div>` section for each question and answer.

    <div id=faqtoids>
        <div class=faq>
            <div class=question>A question?</div>
            <div class=answer>
                Its answer.
            </div>
        </div>
        <div class=faq>
            <div class=question>Why so many questions?</div>
            <div class=answer>
                Because it's easier than fixing bugs.
            </div>
        </div>
    </div>

### How to Add Tours

You can define a tour anywhere in each page:
<!-- title="Title" -->

    <ol id=faqtoidTour data-auto=on>
        <li>This will show centered on page.
        <li data-for="#faqtoid">This will show pointing to the first element matching the css selector in data-for.
    </ol>

`data-auto=on` causes the tour to start automatically the first time anyone visits the page.

FAQtoid has its own "Show Instructions" button if you define a tour. You can also make your own tour starting buttons: `<button class=startFaqtoidTour>Start Tour</button>`

### Options

To customize FAQtoid add any of these attributes to the FAQtoid script Tag:

* data-videos: Comma separated series of youtube video ids. Example value: `ea-XjlC6YKA,fcFl6BgK_vw,XM3r0ouxq2c`
* data-faqs: URL to file of questions and answers. See below for format. Defaults to faqtoids.txt. 
* data-mailscript: URL to post messages to. Omit to have only the FAQ search. Names of parameters sent: email, message, ...
* data-sidebar: Some HTML to insert beside the mail form.

For example, to add tutorial videos to your FAQtoid: `<script id=faqtoidScript src=".../faqtoid.js" data-videos="ea-XjlC6YKA,fcFl6BgK_vw,XM3r0ouxq2c">`

### faqtoids.txt Format

Instead of defining FAQs in a webpage, you can keep them all in their own file. The default name is faqtoids.txt. Example:

    Question... [on one line]
    Answer...<p>You can embed html<p>Use p tags to start new lines in the answer [on next line, no line breaks in the answer either]
        [1 or more blank lines between an answer and the next question]
    Question [use HTML comments to stuff extra keywords] 2...
    Answer 2....`

### Mail Script

To securely receive messages from your visitors through FAQtoid you need to upload one small PHP script to your web host: [faqtoidmail.php](faqtoidmail.php).

Before uploading, save it to your computer, open it in a text editor, and change the email address to your own.

Also add `data-mailscript="faqtoidmail.php"` to your FAQtoid script tag.

If you need help, [contact me](http://faqtoid.patrickroberts.ca/inline.html).
