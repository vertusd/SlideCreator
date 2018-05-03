 {
	// ============================================================================
	// File:	Lrc2AE.jsx
	// Description:
	//		This script import a lrc file into After Effects, creating a text layer
	//		for each lrc line, and place the layer in composition timeline
	//		according to lrc time tags.
	// ============================================================================

	// ============================================================================
	// Function: is_empty_line
	// ============================================================================
	function is_empty_line(lrc_line) {
		var patt_empty = /^\s*$/;
		return patt_empty.test(lrc_line)
	}

	// ============================================================================
	// Function: extract_text
	// ============================================================================
	function extract_text(lrc_line) {
		var patt_tag = /\[[0-9.:]+\]/g;
		var text_line = lrc_line.replace(patt_tag, "");
		return(text_line);
	}

	// ============================================================================
	// Function: extract_time
	// ============================================================================
	function extract_time(lrc_line) {
        
		var patt = /[0-9]+/g;
		var result = lrc_line.match(patt);
		var time = parseFloat(result[0]) * 60
				 + parseFloat(result[1])
				 + parseFloat(result[2])/100;
		return time;
	}
    // ============================================================================
	// Function: add image
	// ============================================================================
	function addImg(layers,path,timeLen,img_obj,count) {
        for(i=1;i<count+1;i++){
            chip = timeLen/count;
            path1 = path+"\\"+i+".jpg";
            var io = new ImportOptions(File(path1));
            if (io.canImportAs(ImportAsType.FOOTAGE));
               io.importAs = ImportAsType.FOOTAGE;
            var imgFootageItem = app.project.importFile(io);
            img_obj=layers.add(imgFootageItem);
            img_obj.inPoint=chip*(i-1)
            img_obj.outPoint=chip*(i);
        }
	}

    // ============================================================================
	// Function: add image with animation
	// ============================================================================
   function buildImageCompose(app, imagesFolder, duration,count) {
         defaultFolder = imagesFolder;
         panZoomEnd = duration/count;
		app.beginUndoGroup("PanZoom.jsx");
		var assetFolder = app.project.items.addFolder("PanZoom Assets  - " + File.decode(imagesFolder));
		var comps = [];
		var files = imagesFolder.getFiles();
		clearOutput();

         //var count = duration/(panZoomEnd-panZoomStart);
         
		alert("count:" +count);
		for (var i = 0; i < count; i++)
		{
			if (isImageFile(files[i].fsName))
			{
				clearOutput();
					
				var io = new ImportOptions();
				var item;
        		try
        		{
        			io.file = files[i];
        			if (io.canImportAs(ImportAsType.FOOTAGE))
        			{
        				io.importAs = ImportAsType.FOOTAGE;
        			}
        			item = app.project.importFile(io);
        		}
        		catch(e)
        		{
        			//alert("File cannot be imported: " + files[i].fsName + ". It will replaced with a placeholder.");
        			item = app.project.importPlaceholder(files[i].name,1920,1080,25,duration);
        		}
        		
        		if (item)
        		{
					item.selected = false;
					
					writeLn((i+1) + "/" + files.length + ": " + item.name);
						
					var comp = app.project.items.addComp(item.name,item.width,item.height,item.pixelAspect,panZoomEnd-panZoomStart,25);
					var layer = comp.layers.add(item);
					createPanZoom(comp,layer);
					
					item.parentFolder = assetFolder;
					comp.parentFolder = assetFolder;
					comps.push(comp);
				}
				
			}
             else
             {
                 count++;
             }
		}
		
		// create final comp
		if (comps.length > 0)
		{			
			var finalComp = app.project.items.addComp("Final - " + File.decode(imagesFolder.name),1920,1080,1,duration,25);
			
			for (var i = 0; i < comps.length; i++)
			{
				writeLn("Final Comp, Layer: " + (i+1) + "/" + comps.length);

				var layer = finalComp.layers.add(comps[i]);

				layer.scale.expression = 
				"sx = 100 * thisComp.width / width; \r" +
				"sy = 100 * thisComp.height / height; \r" +
				"s = Math.max(sx,sy); \r" +
				"[s,s];";		

				layer.startTime = i * (panZoomEnd-panZoomStart);

				var keyTimes = [i * (panZoomEnd-panZoomStart), i * (panZoomEnd-panZoomStart)+0.5,
								(i+1) * (panZoomEnd-panZoomStart)-0.5, (i+1) * (panZoomEnd-panZoomStart)];
				var keyValues = [0,100,100,0];
				layer.opacity.setValuesAtTimes(keyTimes,keyValues);
			}

			finalComp.workAreaDuration = Math.max(finalComp.frameDuration, i * (panZoomEnd-panZoomStart));
		}
		
		if (assetFolder.numItems < 1)
			assetFolder.remove();
		
		
		writeLn("Done !");
		
		app.endUndoGroup();
        return finalComp
		
	}

    function createPanZoom(comp,layer)
    {
        var rulesOfThirdsPoints = [[1/3,1/3],[2/3,1/3],[1/3,2/3],[2/3,2/3]]; // points of interest in image
        var zoomModes = ["IN","OUT"];
            
        var rdIdx = Math.floor(Math.random() * rulesOfThirdsPoints.length);
        var f = rulesOfThirdsPoints[rdIdx];
        var deltaZoomPoint =  [f[0] * comp.width, f[1] * comp.height] - [comp.width/2,comp.height/2];
        
        var rdIdx = Math.floor(Math.random() * zoomModes.length);
        var zoomMode = zoomModes[rdIdx];

        var keyTimes = [panZoomStart,panZoomEnd];
        var keyValues;

        switch(zoomMode)
        {
            case "IN": 
                keyValues = [[100,100],[150,150]]; 
                break;
            case "OUT":
                keyValues = [[150,150],[100,100]]; 
                break;
            default: 
                break;
        }
        
        
        var nullL = comp.layers.addNull();
        
        layer.scale.expression = 
        "sx = 100 * thisComp.width / width; \r" +
        "sy = 100 * thisComp.height / height; \r" +
        "s = Math.max(sx,sy); \r" +
        "[s,s];";
        
        layer.parent = nullL;
        
        nullL.anchorPoint.setValue(nullL.anchorPoint.value + deltaZoomPoint);
        nullL.position.setValue(nullL.position.value + deltaZoomPoint);
        nullL.scale.setValuesAtTimes(keyTimes,keyValues);	
    }

    function isInArray(array, element)
    {
        var found = false;
        for (var i = 0; !found && i < array.length; i++)
        {			
            if (array[i] == element) found = true;
        }		
        return found;	
    }

    function isImageFile(fileName) 
    {	
        var ext = fileName.split(".").pop().toUpperCase();		
        var imageFormats = ["BMP", "CIN", "IIF", "EXR", "GIF", "JPG", "JPEG", "PCX", "PCT", "PNG", "PSD", "PXR", "HDR", "SGI", "TIF", "TGA"]; 
        return isInArray(imageFormats, ext);
    }

    // ============================================================================
	// 使用Mplayer 获取视频时长
	// ============================================================================
    function getAudioLength(filepath){
        var command = "mplayer  -vo null -ao null -frames 0 -identify \"" + filepath +"\"" ;
        var duration = system.callSystem(command);
        var myregexp = /ID_LENGTH=([0-9]+)\.00/i;
        var match = myregexp.exec(duration);
        result = 0;
        if (match != null) {
            result = match[1];
        } else {
            result = "";
        }
        alert(result);
         
        return result;
       }

	// ============================================================================
	// Main Script
	// ============================================================================
	app.beginUndoGroup("Start...");
	var panZoomStart = 0; // in seconds
    var panZoomEnd = 3;
    var defaultFolder;
    if (defaultFolder == null)
    {
        defaultFolder = Folder.current;
    }
    var date = new Date ()
    var month = date.getMonth() + 1;
    if (month >= 1 && month <= 9) {
        month = "0" + month;
    }
    var dateStr  = date.getFullYear().toString ()+month+date.getDate().toString ()
    path = "d:\\Project\\AE\\sources\\"+dateStr
    var imageFolder = new Folder(path);

    // prepare layers
    var actiItem = app.project.activeItem;
    var duration = getAudioLength(path+"\\mp3.mp3");
    actiItem = buildImageCompose(app,imageFolder,duration,8)
	var layers = actiItem.layers;
    var  lrc_file = new File(path+"\\lrc.lrc");
    
    //import mp3 file
    var io = new ImportOptions(File(path+"\\mp3.mp3"));
    if (io.canImportAs(ImportAsType.FOOTAGE));
       io.importAs = ImportAsType.FOOTAGE;
    var mp3FootageItem = app.project.importFile(io);
   
	var lrc_line = "";
	var text_obj = layers.addNull();

	text_obj.name = "Imported with SlideCreator";
	if(lrc_file.exists) {
		lrc_file.open("r","TEXT","????");
		while(!(lrc_file.eof)) {
			// read next line
			lrc_line = lrc_file.readln();
			// line operation
			if (!is_empty_line(lrc_line)) {
				text_obj.outPoint = extract_time(lrc_line);		// outPoint of last layer
				text_obj = layers.addText(extract_text(lrc_line));
				text_obj.startTime = 0;
				text_obj.inPoint = extract_time(lrc_line);		// inPoint of current layer
			}
		}
	}
	text_obj.outPoint = text_obj.outPoint - extract_time(lrc_line);
    layers.add(mp3FootageItem);
	alert("Completed!");
	app.endUndoGroup();
}