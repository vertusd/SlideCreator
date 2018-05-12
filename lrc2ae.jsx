 {
    #include "transverter.js" 
    #include "MoiveObject.js"
    // ============================================================================
    // File:    Lrc2AE.jsx
    // Description:
    //      This script import a lrc file into After Effects, creating a text layer
    //      for each lrc line, and place the layer in composition timeline
    //      according to lrc time tags.
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
        """
        text_line = transverter({
					type:'traditional',
					str:text_line,
					language:"zh_TW"
				});
        """
        return(text_line);
    }

    // ============================================================================
    // Function: extract_time
    // ============================================================================
    function extract_time(lrc_line) {
        
        var patt = /[0-9]+/g;
        var result = lrc_line.match(patt);
        var value = 0;
        if (result[2] >100){
            value = result[2]/1000;
        }else{
            value = result[2]/100;
        }
        var time = parseFloat(result[0]) * 60
                 + parseFloat(result[1])
                 + value;
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
         
        $.writeln("count:" +count);
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
                    $.writeln((i+1) + "/" + files.length + ": " + item.name);
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
                $.writeln("Final Comp, Layer: " + (i+1) + "/" + comps.length);

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

        $.writeln("Done Image Compose !");
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
    
    function addTitleText(actiItem,title_text,is_title) 
    {
        var layers = actiItem.layers;
        var width = Math.floor(title_text.length / 2);
        title_text = transverter({
            type:'traditional',
            str:title_text,
            language:"zh_TW"
        });
        var text  = toVerticalText(title_text,false,width);
        var temp_obj = layers.addText(text);
        temp_obj.name = "Imported with SlideCreator Title";

        var textProp = temp_obj.property("Source Text");
        var textDocument = textProp.value;
         if (is_title)
        {

               textDocument.fontSize = Math.floor(180/width) ;
               textDocument.font = "FZYTK--GBK1-0";


        }
         else
         {
              textDocument.fontSize = 60 ;
               textDocument.font = "chenwixun-fan";
         }
       
        textDocument.fillColor = [1,1,1];
        textDocument.strokeColor = [0, 0, 0];
        textDocument.strokeWidth = 2;
       
        textProp.setValue(textDocument);
        var myRect = temp_obj.sourceRectAtTime(0,false);
        if (is_title)
        {
            var myPos = temp_obj.property("Position").value - myRect.width ;
         }
         else
         {
             var myPos = temp_obj.property("Position").value + myRect.width ;
          }
        
        var myY = myPos[1] + myRect.top + myRect.height/2;
        var deltaY = actiItem.height/2 - myY;
        temp_obj.property("Position").setValue(myPos + [0,deltaY]);
    }
    
    
    function toVerticalText(text , single, width)
    {

        array = {};
        resulttxt  = "";
        verticaltxt = "";
       
        if (width <= 0 || single ==true)
        {
            width = 1;
        }
        $.writeln("width:" + width );
        for(i =0 ;i<text.length ;i++){
             resulttxt += text[i];
             if ((i+1) % (width) ==0 )
             {
                 resulttxt += "\n";
             }          
        }
         $.writeln("resulttxt:" + resulttxt );
        for(i = 0;i <width;i++)
        {    
           // $.writeln("i:" + i );
            res_array = resulttxt.split("\n");
            for(j = 0;j <res_array.length;j++) 
            {   
               $.writeln("line:" +res_array[j] );
               if(res_array[j][i])
               {
                   verticaltxt+= res_array[j][i];
               }
               
               
            }
             verticaltxt+="\n";
        }
        $.writeln(verticaltxt); 
        return verticaltxt
     }
    // ============================================================================
    // 使用Mplayer 获取视频时长
    // ============================================================================
    function getAudioLength(filepath){
        var command = "mplayer -vo null -ao null -frames 0 -identify \"" + filepath +"\"" ;
        var duration = system.callSystem(command);
        var myregexp = /ID_LENGTH=([0-9]+)\.00/i;
        var match = myregexp.exec(duration);
        result = 0;
        if (match != null) {
            result = match[1];
        } else {
            result = "";
        }
        $.writeln(result);
         
        return result;
       }

    // ============================================================================
    // 添加音乐频谱
    // ============================================================================
    function addMusicWave(layers,mp3LayerIndex){
     //add music wave layer
    var color = [255,255,255]
    var wave_layer = layers.addSolid(color,"wave",1920,1080,1,duration);
    wave_layer.Effects.addProperty("ADBE AudSpect");
    var wave =  wave_layer.property("ADBE Effect Parade").property("ADBE AudSpect");
    var waveLayerPosition = [960,20,0];
    var wavePositionS = [960,540];
    var wavePositionE = [1900,540];
    wave.property("ADBE AudSpect-0001").setValue(mp3LayerIndex);
    wave.property("ADBE AudSpect-0002").setValue(wavePositionS);
    wave.property("ADBE AudSpect-0003").setValue(wavePositionE);
    wave.property("ADBE AudSpect-0009").setValue(8000);
    wave.property("ADBE AudSpect-0012").setValue(6);
    wave.property("ADBE AudSpect-0014").setValue(color);
    wave.property("ADBE AudSpect-0015").setValue(color);
    wave.property("ADBE AudSpect-0021").setValue(2);
    wave_layer.Transform.Position.setValue(waveLayerPosition);
    }

    // ============================================================================
    // Main Script
    // ============================================================================
    //强制关闭未保存项目    
    
    var file = new File("D:\\Project\\AE\\SlideCreator\\test.json");
    var movie  = null;
    if(file.open("r")){
       file.encoding = "UTF-8";
       var myjson =file.read();
       var movie = JSON.parse(myjson);
       file.close();
    }
    alert(movie.slides[0].components[0].text);
 
    
    
    
    app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES)
    app.newProject()
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

    var dateStr  = date.getFullYear().toString ()+month+date.getDate().toString ()+"_02";
    path = "d:\\Project\\AE\\sources\\"+dateStr;
    var imageFolder = new Folder(path);

    // prepare layers
    var actiItem = app.project.activeItem;
    
    var duration = getAudioLength(path+"\\mp3.mp3");
    actiItem = buildImageCompose(app,imageFolder,duration,4)
    var layers = actiItem.layers;
    var  lrc_file = new File(path+"\\lrc.lrc");
    
    //import mp3 file
    var io = new ImportOptions(File(path+"\\mp3.mp3"));
    if (io.canImportAs(ImportAsType.FOOTAGE));
       io.importAs = ImportAsType.FOOTAGE;
    var mp3FootageItem = app.project.importFile(io);
    mp3Layer = layers.add(mp3FootageItem);
    
    //add text
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
                var markerIn = new MarkerValue("IN");
                var markerOut = new MarkerValue("OUT");
                text_obj.outPoint = extract_time(lrc_line);     // outPoint of last layer
                text_obj.property("Marker").setValueAtTime(text_obj.outPoint,markerOut);
                text_obj.Transform.Opacity.setValueAtTime(text_obj.outPoint-0.5,100);
                text_obj.Transform.Opacity.setValueAtTime(text_obj.outPoint,0);
                //new layer
                text_obj.locked = true;
                text_obj = layers.addText(extract_text(lrc_line));
                text_obj.startTime = 0;
                text_obj.inPoint = extract_time(lrc_line);      // inPoint of current layer
                text_obj.property("Marker").setValueAtTime(text_obj.inPoint,markerIn);
                text_obj.Transform.Opacity.setValueAtTime(text_obj.inPoint,0);
                text_obj.Transform.Opacity.setValueAtTime(text_obj.inPoint+0.5,100);
                var value = [100,1000,0]
                text_obj.Transform.Position.setValue(value);
                var textProp = text_obj.property("Source Text");
                var textDocument = textProp.value;
                textDocument.resetCharStyle();
                textDocument.fontSize = 60;
                textDocument.fillColor = [1,1,1];
                textDocument.strokeColor = [0, 0, 0];
                textDocument.font = "chenwixun-fan"; 
                textDocument.strokeWidth = 2;
                textDocument.strokeOverFill = false;
                textDocument.applyStroke = true;
                //textDocument.applyFill = true;
                textDocument.font = "HYi2gj"; 

                textProp.setValue(textDocument);
                text_obj.property("Source Text").setValue(textDocument);
            }
        }
    }
    text_obj.outPoint = text_obj.outPoint - extract_time(lrc_line);


    var title_text = "梦中的哈德森啊";
    addTitleText(actiItem,title_text,true);
    var author_text = "赵雷"
    addTitleText(actiItem,author_text,false);


    
    
    addMusicWave(layers,mp3Layer.index+1);
    
    app.project.save(new File(path + '/' + dateStr + ".aep"));
    $.writeln("Completed!");
    app.endUndoGroup();
}