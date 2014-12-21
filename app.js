

var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";

var userEHRId="";
var demoIDs=['638b475d-a532-413b-af75-ee6d3fcff614', '6e8a2391-439f-4470-a33f-fd3583a677a9', 'a83fcbe2-3f77-4f55-921c-8503191bb17d'];

var data= {"age":	[0,1,3,6,13],//od katerega leta naprej
"respiration":		[[40,60],[25,50],[20,30],[20,30],[12,30]],
"systolic":				[[70,100],[80,110],[80,110],[80,120],[110,130],],
"diastolic":			[[60,90],[60,90],[60,90],[60,90],[60,90],],//ni bilo podatkov
"weight":					[[4,10],[10,14],[14,18],[20,60],[50,90],],
"pulse":					[[100,160],[100,120],[80,100],[80,100],[60,80],]};

var ime={
	"temperature":"Telesna temperatura [°C]",
	"respiration":"Hitrost dihanja [vdihov na minuto]",
	"systolic":"Sistolični krvni pritisk [mm Hg]",
	"diastolic":"Diastolični krvni pritisk [mm Hg]",
	"pulse":"Srčni utrip [na min]",
	"height": "Telesna višina[cm]",
	"weight": "Telesna teža [kg]",
}

var myGraphData = [];

var chart;
function graf(){
	nv.addGraph(function() {
	  chart = nv.models.scatterChart()
	                .showDistX(true)    //showDist, when true, will display those little distribution lines on the axis.
	                .showDistY(true)
	                .transitionDuration(350)
	                .color(d3.scale.category10().range());
	
	  //Configure how the tooltip looks.
	  chart.tooltipContent(function(key) {
	      return '<h4>' + key + '</h4>';
	  });
	
	  //Axis settings
	  chart.xAxis
		.tickFormat(function (d) {
			return d3.time.format('%d.%m.%Y')(new Date(d));
		})
		//.tickFormat(d3.format('.02f'));
	  chart.yAxis.tickFormat(d3.format('.02f'));
	
	  //We want to show shapes other than circles.
	  chart.scatter.onlyCircles(false);
	  
	  d3.select('svg')
	      .datum([])
	      .call(chart);
	
	  nv.utils.windowResize(chart.update);
	
	  return chart;
	});
}

function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


function kreirajEHRzaBolnika() {
	var ime = $("#kreirajIme").val();
	var priimek = $("#kreirajPriimek").val();
	var datumRojstva = $("#kreirajDatumRojstva").val();

	if (!ime || !priimek || !datumRojstva || ime.trim().length == 0 || priimek.trim().length == 0 || datumRojstva.trim().length == 0) {
		$("#kreirajSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevane podatke!</span>");
	} else {
		zahtevaZaEHR(ime,priimek,datumRojstva,function(ehrId,party){
            if (party.action == 'CREATE') {
                $("#kreirajSporocilo").html("<span class='obvestilo label label-success fade-in'>Uspešno kreiran EHR '" + ehrId + "'.</span>");
                console.log("Uspešno kreiran EHR '" + ehrId + "'.");
                $("#preberiEHRid").val(ehrId);
            	userEHRId=ehrId;
            }
		}, function(err){
        	$("#kreirajSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
        	console.log(JSON.parse(err.responseText).userMessage);
		});
	}
}

function zahtevaZaEHR(ime,priimek,datumRojstva,success,error){
	sessionId = getSessionId();
	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
	    url: baseUrl + "/ehr",
	    type: 'POST',
	    success: function (data) {
	        var ehrId = data.ehrId;
	        var partyData = {
	            firstNames: ime,
	            lastNames: priimek,
	            dateOfBirth: datumRojstva,
	            partyAdditionalInfo: [{key: "ehrId", value: ehrId}]
	        };
	        $.ajax({
	            url: baseUrl + "/demographics/party",
	            type: 'POST',
	            contentType: 'application/json',
	            data: JSON.stringify(partyData),
	            success: function(party){success(ehrId,party)},
	            error: error
	        });
	    }
	});
}

function preberiEHRodBolnika() {
	sessionId = getSessionId();

	var ehrId = $("#preberiEHRid").val();

	if (!ehrId || ehrId.trim().length == 0) {
		console.log(userEHRId);
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	userEHRId=ehrId;
	$.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (data) {
			var party = data.party;
			$("#preberiSporocilo").html("<span class='obvestilo label label-success fade-in'>Bolnik '" + party.firstNames + " " + party.lastNames + "', ki se je rodil '" + party.dateOfBirth + "'.</span>");
			console.log("Bolnik '" + party.firstNames + " " + party.lastNames + "', ki se je rodil '" + party.dateOfBirth + "'.");
		},
		error: function(err) {
			$("#preberiSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}


function dodajMeritveVitalnihZnakov() {
	sessionId = getSessionId();

	var ehrId = $("#dodajVitalnoEHR").val();
	var datumInUra = $("#dodajVitalnoDatumInUra").val(); //default je zdaj!
	var telesnaVisina = $("#dodajVitalnoTelesnaVisina").val();
	var telesnaTeza = $("#dodajVitalnoTelesnaTeza").val();
	var telesnaTemperatura = $("#dodajVitalnoTelesnaTemperatura").val();
	var sistolicniKrvniTlak = $("#dodajVitalnoKrvniTlakSistolicni").val();
	var diastolicniKrvniTlak = $("#dodajVitalnoKrvniTlakDiastolicni").val();
	var nasicenostKrviSKisikom = $("#dodajVitalnoNasicenostKrviSKisikom").val();
	var merilec = $("#dodajVitalnoMerilec").val();
	var pulz = $("#dodajVitalnoSrcniUtrip").val();
	var dihanje = $("#dodajVitalnoHitrostDihanja").val();

	if (!ehrId || ehrId.trim().length == 0) {
		console.log(userEHRId);
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	userEHRId=ehrId;
	posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,pulz,dihanje,merilec);
}

function posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,pulz,dihanje,merilec){
	$.ajaxSetup({
		headers: {"Ehr-Session": sessionId}
	});
	var podatki = {
		// Preview Structure: https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
		"ctx/language": "en",
		"ctx/territory": "SI",
		"ctx/time": datumInUra,
		"vital_signs/height_length/any_event/body_height_length": telesnaVisina,
		"vital_signs/body_weight/any_event/body_weight": telesnaTeza,
		"vital_signs/body_temperature/any_event/temperature|magnitude": telesnaTemperatura,
		"vital_signs/body_temperature/any_event/temperature|unit": "°C",
		"vital_signs/blood_pressure/any_event/systolic": sistolicniKrvniTlak,
		"vital_signs/blood_pressure/any_event/diastolic": diastolicniKrvniTlak,
		"vital_signs/indirect_oximetry:0/spo2|numerator": nasicenostKrviSKisikom,
		"vital_signs/pulse/any_event/rate": pulz,
		"vital_signs/respirations/any_event/rate": dihanje,
	};
	var parametriZahteve = {
		"ehrId": ehrId,
		templateId: 'Vital Signs',
		format: 'FLAT',
		committer: merilec
	};
	$.ajax({
		url: baseUrl + "/composition?" + $.param(parametriZahteve),
		type: 'POST',
		contentType: 'application/json',
		data: JSON.stringify(podatki),
		success: function (res) {
			console.log(res.meta.href);
			$("#dodajMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-success fade-in'>" + res.meta.href + ".</span>");
		},
		error: function(err) {
			$("#dodajMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}

function demoDone(){
	demosDone+=1;
	if(demosDone==3){
		$("#kreirajSporocilo").html("<span class='obvestilo label label-success fade-in'>Demo uspešno kreiran: '" + demoIDs[0] +"', '"+demoIDs[1]+"', '"+demoIDs[2]+ "'.</span>");
		
	}
}

function kreirajDemo1(){
	zahtevaZaEHR("Zdravi","Človek","1960-10-30T00:00",function(ehrId, party) {
		demoIDs[0]=ehrId;
		userEHRId=ehrId;
		var datumInUra = new Date();
		datumInUra.setDate();
		datumInUra.setFullYear(1975);
		for(var i =0;i<100;i++){
			var mesec=datumInUra.getMonth();
			datumInUra.setMonth(mesec+1);
			var telesnaVisina = 110+Math.pow(i,0.5);
			var telesnaTeza = 50 + i/3 + Math.random();
			var telesnaTemperatura = 35.2 + Math.random()*2;
			var sistolicniKrvniTlak = 120 + 10*Math.random();
			var diastolicniKrvniTlak = 60 + 10*Math.random();
			var nasicenostKrviSKisikom = 95 + 5*Math.random();
			var merilec = "Zdravi Človek";
			var pulz=60 +10*Math.random();
			var dihanje=18+Math.random();
			posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,pulz,dihanje,merilec);
		}
		demoDone();
	},function(err) {
	    alert(err);
	});
}

function kreirajDemo2(){
	zahtevaZaEHR("Srčni","Bolnik","1960-11-30T00:00",function(ehrId, party) {
		demoIDs[1]=ehrId;
		userEHRId=ehrId;
		var datumInUra = new Date();
		datumInUra.setDate();
		datumInUra.setFullYear(1990);
		for(var i =0;i<100;i++){
			var mesec=datumInUra.getMonth();
			datumInUra.setMonth(mesec+1);
			var telesnaVisina = 170;
			var telesnaTeza = 81 +Math.sin(i/100)+ Math.random();
			var telesnaTemperatura = 35.2 + Math.random()*1.8;
			var sistolicniKrvniTlak = 130 + 30*Math.random();
			var diastolicniKrvniTlak = 65 + 35*Math.random();
			var nasicenostKrviSKisikom = 95 + 5*Math.random();
			var merilec = "Medicinska sestra";
			var pulz=60 +30*Math.random();
			var dihanje=18+4*Math.random();
			posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,pulz,dihanje,merilec);
		}
		demoDone();
	},function(err) {
	    alert(err);
	});
}

function kreirajDemo3(){
	zahtevaZaEHR("Žrtev","Infarkta","1970-11-30T00:00",function(ehrId, party) {
		demoIDs[2]=ehrId;
		userEHRId=ehrId;
		var datumInUra = new Date();
		datumInUra.setDate();
		datumInUra.setFullYear(1995);
		for(var i =0;i<100;i++){
			var mesec=datumInUra.getMonth();
			datumInUra.setMonth(mesec+1);
			var telesnaVisina = 170+Math.random();
			var telesnaTeza = 81 +Math.sin(i/20)+ Math.random();
			var telesnaTemperatura = 35.2 + Math.random()*2.1;
			var sistolicniKrvniTlak = 110 + 15*Math.random()+Math.pow(2,i/20);
			var diastolicniKrvniTlak = 60 + 30*Math.random()+Math.pow(2,i/25);
			var nasicenostKrviSKisikom = 95 + 5*Math.random();
			var merilec = "Medicinska sestra";
			var pulz=60 +20*Math.random()+Math.pow(2,i/20);
			var dihanje=18+4*Math.random()+Math.pow(2,i/30);
			posljiMeritve(ehrId,datumInUra,telesnaVisina,telesnaTeza,telesnaTemperatura,sistolicniKrvniTlak,diastolicniKrvniTlak,nasicenostKrviSKisikom,pulz,dihanje,merilec);
		}
		demoDone();
	},function(err) {
	    alert(err);
	});
}

var demosDone;

function kreirajDemo(){
	demosDone=0;
	kreirajDemo1();
	kreirajDemo2();
	kreirajDemo3();
}

var results;
function preberiMeritveVitalnihZnakov() {
	sessionId = getSessionId();	

	var ehrId = $("#meritveVitalnihZnakovEHRid").val();
	var tip = $("#preberiTipZaVitalneZnake").val();

	if (!ehrId || ehrId.trim().length == 0){
		console.log(userEHRId);
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	userEHRId=ehrId;
	if( !tip || tip.trim().length == 0) {
		$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
		return;
	}
	$("#preberiMeritveVitalnihZnakovSporocilo").html("");
	$.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrId + "/party",
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (res) {
			var party = res.party;
			
			//$("#rezultatMeritveVitalnihZnakov").html("<br/><span>Pridobivanje podatkov za <b>'" + ime[tip] + "'</b> bolnika <b>'" + party.firstNames + " " + party.lastNames + "'</b>.</span><br/><br/>");
			myGraphData=[];
			var age=(new Date().getTime() - new Date(party.dateOfBirth.split("T")[0]).getTime())/1000/60/60/24/356
			console.log(new Date());
			console.log(new Date(party.dateOfBirth.split("T")[0]));
			console.log("age "+age);
			var i,j;
			for (i in data["age"]){
				if(age<=i){
					break;
				}
				else{
					j=i;
				}
			}
			console.log("age group "+j);
			var a,b,c,d;
			if(tip in data){
				b=data[tip][j][0];
				c=data[tip][j][1];
				console.log(b);
				console.log(c);
			}
			else{
				if(tip=="temperature"){
					a=34;
					b=35;
					c=37;
					d=40;
				}
				else{
					a=0
					b=0;
					c=10000;
					d=10000;
				}
			}
			var dif=c-b;
			if(tip=="respiration"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tip=="pulse"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tip=="systolic"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tip=="diastolic"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tip=="weight"){
				a=b-dif;
				d=c+dif;
			}
			$("#rezultatMeritveVitalnihZnakov").html("");
			results="<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>"+ ime[tip] +"</th></tr>";
			AQLquerry(ehrId,tip,0,a,"nevarno nizka vrednost");
			AQLquerry(ehrId,tip,a,b,"neobičajno nizka vrednost");
			AQLquerry(ehrId,tip,b,c,"normalna vrednost");
			AQLquerry(ehrId,tip,c,d,"neobičajno visoka vrednost");
			AQLquerry(ehrId,tip,d,10000,"nevarno visoka vrednost");
		},
		error: function(err) {
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}


function AQLquerry(ehrId,podatek,min,max,ime){
  var podatki={"temperature": ["OBSERVATION t[openEHR-EHR-OBSERVATION.body_temperature.v1]","t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude","t/data[at0002]/events[at0003]/time/value"],
  						 "systolic": 		["OBSERVATION t[openEHR-EHR-OBSERVATION.blood_pressure.v1]","t/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude","t/data[at0001]/events[at0006]/time/value"],
  						 "diastolic": 	["OBSERVATION t[openEHR-EHR-OBSERVATION.blood_pressure.v1]","t/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude","t/data[at0001]/events[at0006]/time/value"],
  						 "pulse":				["OBSERVATION t[openEHR-EHR-OBSERVATION.heart_rate-pulse.v1]","t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude","t/data[at0002]/events[at0003]/time/value"],
  						 "respiration": ["OBSERVATION t[openEHR-EHR-OBSERVATION.respiration.v1]","t/data[at0001]/events[at0002]/data[at0003]/items[at0004]/value/magnitude","t/data[at0001]/events[at0002]/time/value"],
  						 "weight":			["OBSERVATION t[openEHR-EHR-OBSERVATION.body_weight.v1]","t/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value/magnitude","t/data[at0002]/events[at0003]/time/value"],
  						 "height":			["OBSERVATION t[openEHR-EHR-OBSERVATION.height.v1]","t/data[at0001]/events[at0002]/data[at0003]/items[at0004, 'Body Height/Length']/value/magnitude","t/data[at0001]/events[at0002]/time/value"],
  };
	
	var AQL = 
		"select " +
			podatki[podatek][2]+ " as cas, " +
			podatki[podatek][1]+ " as vrednost " +
		"from EHR e[e/ehr_id/value='" + ehrId + "'] " +
		"contains "+podatki[podatek][0]+" " +
		"where "+podatki[podatek][1]+">"+min+" and "+podatki[podatek][1]+"<"+max+" " +
		"order by t/data[at0002]/events[at0003]/time/value desc " +
		"limit 100";
		console.log(AQL);
	$.ajax({
		url: baseUrl + "/query?" + $.param({"aql": AQL}),
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (res) {
			var group = {
		  key: ime,
		  values: []
			}
			if (res){
				var rows = res.resultSet;
				for (var i in rows) {
					if(i<15){
						results += "<tr><td>" + rows[i].cas + "</td><td class='text-right'>" + rows[i].vrednost + " "  + "</td></tr>";
					}
					group.values.push({
						x:new Date(rows[i].cas.split("T")[0]).getTime(),
						y:rows[i].vrednost,
						size: 1,
						shape: "circle"
						});
				}
			}
			myGraphData.push(group);
			if(myGraphData.length==5){
				drawGraph();
			}

		},
		error: function(err) {
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}

function drawGraph(){
	$("#rezultatMeritveVitalnihZnakov").append(results+"</table>");
	var podatki=false
	for(var i=0;i<myGraphData.length;i++){
		if(myGraphData[i].values.length!=0){
			podatki=true;
		}
		else{
			myGraphData.splice(i, 1);
			i--;
		}
	}
	if(podatki){
		d3.select('svg')
		  .datum(myGraphData)
		  .call(chart);
		nv.utils.windowResize(chart.update);
	}
	else{
		$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Ni podatkov!</span>");
	}
}

var obdobja,podatkiObdobja,ehrIdObdobja,tipObdobja;
function prikaziObdobja(){
	var podatki={"temperature": ["OBSERVATION t[openEHR-EHR-OBSERVATION.body_temperature.v1]","t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude","t/data[at0002]/events[at0003]/time/value"],
  						 "systolic": 		["OBSERVATION t[openEHR-EHR-OBSERVATION.blood_pressure.v1]","t/data[at0001]/events[at0006]/data[at0003]/items[at0004]/value/magnitude","t/data[at0001]/events[at0006]/time/value"],
  						 "diastolic": 	["OBSERVATION t[openEHR-EHR-OBSERVATION.blood_pressure.v1]","t/data[at0001]/events[at0006]/data[at0003]/items[at0005]/value/magnitude","t/data[at0001]/events[at0006]/time/value"],
  						 "pulse":				["OBSERVATION t[openEHR-EHR-OBSERVATION.heart_rate-pulse.v1]","t/data[at0002]/events[at0003]/data[at0001]/items[at0004]/value/magnitude","t/data[at0002]/events[at0003]/time/value"],
  						 "respiration": ["OBSERVATION t[openEHR-EHR-OBSERVATION.respiration.v1]","t/data[at0001]/events[at0002]/data[at0003]/items[at0004]/value/magnitude","t/data[at0001]/events[at0002]/time/value"],
  						 "weight":			["OBSERVATION t[openEHR-EHR-OBSERVATION.body_weight.v1]","t/data[at0002]/events[at0003]/data[at0001]/items[at0004, 'Body weight']/value/magnitude","t/data[at0002]/events[at0003]/time/value"],
  						 "height":			["OBSERVATION t[openEHR-EHR-OBSERVATION.height.v1]","t/data[at0001]/events[at0002]/data[at0003]/items[at0004, 'Body Height/Length']/value/magnitude","t/data[at0001]/events[at0002]/time/value"],
  };
	var ehrId = $("#meritveVitalnihZnakovEHRid").val();
	ehrIdObdobja=ehrId;
	var podatek=$("#preberiTipZaVitalneZnake").val();
	tipObdobja=podatek;
	if (!ehrId || ehrId.trim().length == 0){
		console.log(userEHRId);
		if(!userEHRId || userEHRId.trim().length == 0){
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
			return;
		}
		else{
			ehrId=userEHRId;
		}
	}
	userEHRId=ehrId;
	if( !podatek || podatek.trim().length == 0) {
		$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-warning fade-in'>Prosim vnesite zahtevan podatek!");
		return;
	}
	$("#preberiMeritveVitalnihZnakovSporocilo").html("");
	sessionId = getSessionId();
	var AQL = 
		"select " +
			podatki[podatek][2]+ " as cas, " +
			podatki[podatek][1]+ " as vrednost " +
		"from EHR e[e/ehr_id/value='" + ehrId + "'] " +
		"contains "+podatki[podatek][0]+" " +
		"order by" +podatki[podatek][2]+" desc " +
		"limit 10000";
	console.log(AQL);
	$.ajax({
		url: baseUrl + "/query?" + $.param({"aql": AQL}),
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (res) {
			if (res){
				var rows = res.resultSet;
				podatkiObdobja=rows;
				var konec=new Date(rows[0].cas.split("T")[0]);
				var zacetek=new Date(rows[rows.length-1].cas.split("T")[0])
				console.log(zacetek,konec);
				var dif=(konec.getTime()-zacetek.getTime())/10;
				var obd="";
				obdobja=[];
				for(var i=0;i<10;i++){
					var z=new Date(zacetek.getTime()+i*dif);
					var k=new Date(zacetek.getTime()+(i+1)*dif);
					obdobja.push({"zacetek":z,"konec":k});
					obd+='<button type="button" class="btn btn-default btn-xs" onclick="izbranoObdobje('+i+')">'+d3.time.format('%d.%m.%Y')(z)+" / "+d3.time.format('%d.%m.%Y')(k)+'</button><br>';
				}
				$("#obdobja").html(obd);
			}
		},
		error: function(err) {
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}
var idx;
function izbranoObdobje(i){
	idx=parseInt(i);
	$("#rezultatMeritveVitalnihZnakov").html("");
	$.ajax({
		url: baseUrl + "/demographics/ehr/" + ehrIdObdobja + "/party",
		type: 'GET',
		headers: {"Ehr-Session": sessionId},
		success: function (res) {
			var party=res.party;
			var z=obdobja[idx]["zacetek"].getTime();
			var k=obdobja[idx]["konec"].getTime();
			myGraphData=[
			{key: "nevarno nizka vrednost",values: []},
			{key: "neobičajno nizka vrednost",values: []},
			{key: "običajna vrednost",values: []},
			{key: "neobičajno visoka vrednost",values: []},
			{key: "nevarno visoka vrednost",values: []},
			]
			var age=(new Date().getTime() - new Date(party.dateOfBirth.split("T")[0]).getTime())/1000/60/60/24/356
			console.log(new Date());
			console.log(new Date(party.dateOfBirth.split("T")[0]));
			console.log("age "+age);
			var i,j;
			for (i in data["age"]){
				if(age<=i){
					break;
				}
				else{
					j=i;
				}
			}
			console.log("age group "+j);
			var a,b,c,d;
			if(tipObdobja in data){
				b=data[tipObdobja][j][0];
				c=data[tipObdobja][j][1];
				console.log(b);
				console.log(c);
			}
			else{
				if(tipObdobja=="temperature"){
					a=34;
					b=35;
					c=37;
					d=40;
				}
				else{
					a=0
					b=0;
					c=10000;
					d=10000;
				}
			}
			var dif=c-b;
			if(tipObdobja=="respiration"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tipObdobja=="pulse"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tipObdobja=="systolic"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tipObdobja=="diastolic"){
				a=b-dif/2;
				d=c+dif/2;
			}
			else if(tipObdobja=="weight"){
				a=b-dif;
				d=c+dif;
			}
			results="<table class='table table-striped table-hover'><tr><th>Datum in ura</th><th class='text-right'>"+ ime[tipObdobja] +"</th></tr>";
			var j=0;
			for(var i in podatkiObdobja){
				var t=new Date(podatkiObdobja[i].cas.split("T")[0]).getTime();
				//console.log("meje in vrednost",z,k,t);
				if(z<=t && t<=k){
					console.log("in");
					if(j<15){
						results += "<tr><td>" + podatkiObdobja[i].cas + "</td><td class='text-right'>" + podatkiObdobja[i].vrednost + " "  + "</td></tr>";
					}
					j++;
					if(podatkiObdobja[i].vrednost<a){
						myGraphData[0].values.push({
									x:new Date(podatkiObdobja[i].cas.split("T")[0]).getTime(),
									y:podatkiObdobja[i].vrednost,
									size: 1,
									shape: "circle"
									});
					}
					else if(a<podatkiObdobja[i].vrednost && podatkiObdobja[i].vrednost<b){
						myGraphData[1].values.push({
									x:new Date(podatkiObdobja[i].cas.split("T")[0]).getTime(),
									y:podatkiObdobja[i].vrednost,
									size: 1,
									shape: "circle"
									});
					}
					else if(b<podatkiObdobja[i].vrednost && podatkiObdobja[i].vrednost<c){
						myGraphData[2].values.push({
									x:new Date(podatkiObdobja[i].cas.split("T")[0]).getTime(),
									y:podatkiObdobja[i].vrednost,
									size: 1,
									shape: "circle"
									});
					}
					else if(c<podatkiObdobja[i].vrednost && podatkiObdobja[i].vrednost<d){
						myGraphData[3].values.push({
									x:new Date(podatkiObdobja[i].cas.split("T")[0]).getTime(),
									y:podatkiObdobja[i].vrednost,
									size: 1,
									shape: "circle"
									});
					}
					else if(podatkiObdobja[i].vrednost>d){
						myGraphData[4].values.push({
									x:new Date(podatkiObdobja[i].cas.split("T")[0]).getTime(),
									y:podatkiObdobja[i].vrednost,
									size: 1,
									shape: "circle"
									});
					}
				}
			}
			console.log(results);
			drawGraph();
		},
		error: function(err) {
			$("#preberiMeritveVitalnihZnakovSporocilo").html("<span class='obvestilo label label-danger fade-in'>Napaka '" + JSON.parse(err.responseText).userMessage + "'!");
			console.log(JSON.parse(err.responseText).userMessage);
		}
	});
}

$(document).ready(function() {
	$('#preberiObstojeciEHR').change(function() {
		$("#preberiSporocilo").html("");
		$("#preberiEHRid").val(demoIDs[parseInt($(this).val())]);
	});
	$('#preberiPredlogoBolnika').change(function() {
		$("#kreirajSporocilo").html("");
		var podatki = $(this).val().split(",");
		$("#kreirajIme").val(podatki[0]);
		$("#kreirajPriimek").val(podatki[1]);
		$("#kreirajDatumRojstva").val(podatki[2]);
	});
	$('#preberiObstojeciVitalniZnak').change(function() {
		$("#dodajMeritveVitalnihZnakovSporocilo").html("");
		var podatki = $(this).val();
		$("#dodajVitalnoEHR").val(demoIDs[parseInt(podatki)]);
	});
	$('#preberiTipZaVitalneZnake').change(function() {
		$("#obdobja").html("");
	});
	$('#preberiEhrIdZaVitalneZnake').change(function() {
		$("#preberiMeritveVitalnihZnakovSporocilo").html("");
		$("#rezultatMeritveVitalnihZnakov").html("");
		$("#obdobja").html("");
		$("#meritveVitalnihZnakovEHRid").val(demoIDs[parseInt($(this).val())]);
	});
	graf();
});