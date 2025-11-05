function parseStatLine(line,options){
  line=line.replace(/ +(?= )/g,'')// replace multiple spaces

  if(!options.root.regex.exec(line)){
    return {}
  }//root stat line

  var result={}
  var tmp=null
  try{
    options.params.forEach(item=>{
      item.keys=item.keys||1
      tmp=item.regex.exec(line)
      if(tmp){
        if(!item.keys||item.keys==1){result[item.name]=tmp[1]}    
        else{
          var subarray=[]
          for(var i=1;i<item.keys+1;i++){
            subarray.push(tmp[i])
          }//for
          result[item.name]=subarray
        }//else
      }//if
    })
  } catch(err) {console.error(err)}

  return result
}


function parseProcessLine(str){
  var result={}
  var regex=/(?<=)\S+/g //capture values beetween spaces
  var result={}
  try{
    var data=[...str.matchAll(regex)]

    result= {
      "pid":data[0][0],
      "user":data[1][0],
      "pr":data[2][0],
      "ni":data[3][0],
      "virt":data[4][0],
      "res":data[5][0],
      "shr":data[6][0],
      "s":data[7][0],
      "cpu":data[8][0],
      "mem":data[9][0],
      "time":data[10][0],
      "command":data[11][0],
    }
  } catch(err) {console.error(err)}
  return result
}





// {
//     pid_limit:10,//limit number of included pids in list (default: unlimited)
//     pid_filter:(proc)=>{return proc.user=="root"?proc:null},// filtering the pid list (for example: include only pid with user == root) (default: null)
//     pid_sort:(a,b)=>{return a.cpu-b.cpu},// sorting pid list by cpu usage (default)
// }

function processTopData( data, options={pid_sort(a,b){return a.cpu-b.cpu}} ) {
  var data=data.split("\n").filter(v=>v!="")
  var result={

    top:parseStatLine(data[0],
      {
        root:{regex:/top \-/g,name:"top"},//root line params
        params:[// parse variable values
          {regex: /(\d+\:\d+\:\d+) up/g, name:"time"},
          // {regex: /up  ([0-9,\:]+)\,/g, name:"up"},
          {regex: / ([0-9,\:]+)\, \d+ user/g, name:"up_hours"},
          {regex: / (\d+) days/g, name:"up_days"},
  
          {regex: /(\d+) users/g, name:"users"},
          {regex: /load average: (\d+\.\d+)\, (\d+\.\d+)\, (\d+\.\d+)/g, name:"load_average",keys:3},//need subarray with values
          // {regex: /(\d+) zombie/g, name:"zombie"},
        ]
  
      },
    ),

    tasks:parseStatLine(data[1],
      {
        root:{regex:/Tasks/g,name:"tasks"},//root line params
        params:[// parse variable values
          {regex: /(\d+) total/g, name:"total"},
          {regex: /(\d+) running/g, name:"running"},
          {regex: /(\d+) sleeping/g, name:"sleeping"},
          {regex: /(\d+) stopped/g, name:"stopped"},
          {regex: /(\d+) zombie/g, name:"zombie"},
        ]
  
      },
    ),

    // cpu:parseStatLine(data[2],
      // {
        // root:{regex:/%Cpu/g,name:"cpu"},//root line params
        // params:[// parse variable values
          // {regex: /(\d+\.\d) us/g, name:"us"},
          // {regex: /(\d+\.\d) sy/g, name:"sy"},
          // {regex: /(\d+\.\d) ni/g, name:"ni"},
          // {regex: /(\d+\.\d) id/g, name:"id"},
          // {regex: /(\d+\.\d) wa/g, name:"wa"},
          // {regex: /(\d+\.\d) hi/g, name:"hi"},
          // {regex: /(\d+\.\d) si/g, name:"si"},
          // {regex: /(\d+\.\d) st/g, name:"st"},
        // ]
      // },
    // ),

    mem:parseStatLine(data[3],
      {
        root:{regex:/MiB Mem/g,name:"mem"},//root line params
        params:[// parse variable values
          {regex: /(\d+\.\d) total/g, name:"total"},
          {regex: /(\d+\.\d) used/g, name:"used"},
          {regex: /(\d+\.\d) free/g, name:"free"},
          {regex: /(\d+\.\d) buffers/g, name:"buffers"},
          {regex: /(\d+\.\d) buff\/cache/g, name:"buff_cache"},
        ]
        
      }
      ),

    // swap:parseStatLine(data[4],
      // {
        // root:{regex:/MiB Swap/g,name:"swap"},//root line params
        // params:[// parse variable values
          // {regex: /(\d+\.\d) total/g, name:"total"},
          // {regex: /(\d+\.\d) used/g, name:"used"},
          // {regex: /(\d+\.\d) free/g, name:"free"},
          // {regex: /(\d+\.\d) cached Mem/g, name:"cached_mem"},
          // {regex: /(\d+\.\d) avail Mem/g, name:"avail_mem"},
        // ]
      // },
    // ),
      
    // processes:[...( [
        // (()=>{
          // var result=[]
          // for (var i=5;i<data.length-1;i++){
            // var proc=null
            // try{
              // var proc=parseProcessLine(data[i])
              // if(typeof options.pid_filter=="function"){
                // proc=options.pid_filter(proc)
              // }//if
            // } catch(err) {console.error(err)}
            // proc?result.push(proc):null            
          // }//for
          // return result.slice(0,options.pid_limit||result.length).sort(options.pid_sort)
         // })()//for
    // ]
    // )]
    
  }//result
  
  return result
}

module.exports = {
  processTopData,
};


// data=`top - 02:49:04 up 35 days, 23:26,  0 user,  load average: 0.42, 0.24, 0.11
// Tasks:  32 total,   1 running,  31 sleeping,   0 stopped,   0 zombie
// %Cpu(s):  0.0 us,  0.0 sy,  0.0 ni,100.0 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st
// MiB Mem :   4413.7 total,    224.1 free,   1332.9 used,   3154.7 buff/cache
// MiB Swap:   2304.0 total,   2201.0 free,    103.0 used.   3080.8 avail Mem

    // PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND
      // 1 root      20   0    2332   1024   1024 S   0.0   0.0   0:00.04 dumb-in+
      // 7 root      20   0   37260  31280  10240 S   0.0   0.7   0:02.25 supervi+
     // 49 root      20   0    2896   1536   1536 S   0.0   0.0   0:00.55 tail
   // 1899 root      20   0   24800  18048   9088 S   0.0   0.4   0:01.06 python3
   // 1946 _mta-sts  20   0  335112  34004  12288 S   0.0   0.8   0:15.53 mta-sts+
   // 1953 root      20   0    3980   2304   2176 S   0.0   0.1   0:00.02 cron
   // 1962 root      20   0  152128   4352   3840 S   0.0   0.1   0:00.03 rsyslogd
   // 1970 root      20   0    8236   4224   3840 S   0.0   0.1   0:00.05 dovecot
   // 1977 dovecot   20   0    4748   2816   2688 S   0.0   0.1   0:00.00 anvil
   // 1978 root      20   0    5012   3072   2688 S   0.0   0.1   0:00.00 log
   // 1979 root      20   0    7964   5376   3456 S   0.0   0.1   0:00.02 config
   // 1981 root      20   0    4436   3328   2944 S   0.0   0.1   0:00.01 update-+
   // 2009 root      20   0   72552  12472   9088 S   0.0   0.3   0:12.51 redis-s+
   // 2019 root      20   0  219776 107776  68480 S   0.0   2.4   0:00.56 rspamd
   // 2027 root      20   0   19088  14564   6144 S   0.0   0.3   0:00.13 pidproxy
   // 2033 root      20   0    2580   1664   1536 S   0.0   0.0   0:00.00 postfix+
   // 2063 _rspamd   20   0  221056  49896   9088 S   0.0   1.1   0:00.74 rspamd
   // 2064 _rspamd   20   0  221056  49896   9088 S   0.0   1.1   0:00.67 rspamd
   // 2065 _rspamd   20   0  221836  53224  12416 S   0.0   1.2   0:01.52 rspamd
   // 2066 _rspamd   20   0  219776  43604   3944 S   0.0   1.0   0:00.06 rspamd
   // 2070 root      20   0  694364  25036  11392 S   0.0   0.6   0:06.95 fail2ba+
   // 2115 root      20   0   42668   5376   4864 S   0.0   0.1   0:00.05 master
   // 2119 postfix   20   0   42736   5376   4864 S   0.0   0.1   0:00.01 qmgr
   // 2131 root      20   0    5756   4608   2944 S   0.0   0.1   0:13.30 check-f+
   // 2563 root      20   0    2864   1536   1536 S   0.0   0.0   0:00.00 sleep
   // 8327 postfix   20   0   48448   9728   8448 S   0.0   0.2   0:00.01 tlsmgr
  // 11603 dovenull  20   0   10920   8576   7296 S   0.0   0.2   0:00.02 imap-lo+
  // 11605 docker    20   0   56912  12032  10368 S   0.0   0.3   0:00.03 imap
  // 16725 postfix   20   0   42692   5376   4864 S   0.0   0.1   0:00.00 pickup
  // 17727 root      20   0    2864   1536   1536 S   0.0   0.0   0:00.00 sleep
  // 17734 root      20   0    2580   1536   1536 S   0.0   0.0   0:00.00 sh
  // 17735 root      20   0    8808   4864   2944 R   0.0   0.1   0:00.00 top`


  // top: {
    // time: '04:13:09',
    // up_days: '36',
    // load_average: [ '0.01', '0.06', '0.01' ]
  // },
  // tasks: {
    // total: '30',
    // running: '1',
    // sleeping: '29',
    // stopped: '0',
    // zombie: '0'
  // },
  // cpu: {
    // us: '0.0',
    // sy: '100.0',
    // ni: '0.0',
    // id: '0.0',
    // wa: '0.0',
    // hi: '0.0',
    // si: '0.0',
    // st: '0.0'
  // },
  // mem: {
    // total: '4413.7',
    // used: '1325.7',
    // free: '132.7',
    // buff_cache: '3253.5'
  // },
  // swap: {
    // total: '2304.0',
    // used: '103.0',
    // free: '2201.0',
    // avail_mem: '3088.1'
  // },
  // processes: [
    // [
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object],
      // [Object], [Object], [Object]
    // ]
  // ]
// }