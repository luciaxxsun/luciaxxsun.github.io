/* =========================================================================
   通用建筑生成器：模板 + 配色 + 装饰件 → 任意 w×h 格的建筑贴图
   ========================================================================= */
function shade(hex, amt){
  var n = parseInt(hex.slice(1), 16);
  var r = Math.max(0, Math.min(255, ((n>>16)&255) + amt));
  var gg = Math.max(0, Math.min(255, ((n>>8)&255) + amt));
  var b = Math.max(0, Math.min(255, (n&255) + amt));
  return '#' + ((1<<24) + (r<<16) + (gg<<8) + b).toString(16).slice(1);
}

function sprBldSprite(o){
  var W = o.w*16, H = o.h*16;
  var c = CV(W, H), g = c.getContext('2d');
  var r = rng(o.seed || (o.w*37 + o.h*91 + (o.tpl||'x').length*11));
  var wall  = o.wall || '#e6d6ae';
  var wallD = shade(wall, -28), wallL = shade(wall, 18);
  var roof  = o.roof || '#b8442f';
  var roofD = shade(roof, -36), roofL = shade(roof, 20);
  var trim  = o.trim || '#f2e8cc';
  var tpl   = o.tpl || 'gable';

  function box(x0,y0,x1,y1){
    R(g,x0,y0,x1-x0,y1-y0,wall);
    R(g,x0,y0,x1-x0,2,wallL);
    R(g,x0,y1-2,x1-x0,2,wallD);
    R(g,x0,y0,2,y1-y0,wallD);
    R(g,x1-2,y0,2,y1-y0,wallD);
  }
  function planks(x0,y0,x1,y1){
    for(var y=y0+4;y<y1-2;y+=4) R(g,x0+2,y,x1-x0-4,1,shade(wall,-16));
    for(var x=x0+7;x<x1-4;x+=9) R(g,x,y0+2,1,y1-y0-4,shade(wall,-10));
  }
  function door(x,y,w,h,col){
    col = col || '#7a5230';
    R(g,x,y,w,h,col);
    R(g,x+1,y+1,w-2,h-2,shade(col,18));
    R(g,x,y,w,2,shade(col,-24));
    PX(g,x+w-3,y+Math.floor(h/2),'#ffcf4d');
  }
  function win(x,y,w,h){
    R(g,x,y,w,h,'#6a4a2c');
    R(g,x+1,y+1,w-2,h-2,'#8fd0e8');
    R(g,x+1,y+1,w-2,1,'#c8eeff');
    R(g,x+Math.floor(w/2),y+1,1,h-2,'#5f9ab4');
    R(g,x+1,y+1,w-2,h-2,'rgba(255,255,255,0)');
  }
  function chimney(x,y){
    R(g,x,y,5,10,'#8d8d8d'); R(g,x,y,5,2,'#b0b0b0');
    R(g,x-1,y-2,7,2,'#5f5f5f');
  }
  function awning(x0,x1,y,cols){
    cols = cols || ['#e8e0d0','#c8443a'];
    for(var i=0;x0+i*4<x1;i++) R(g,x0+i*4,y,Math.min(4,x1-(x0+i*4)),5,cols[i%2]);
    R(g,x0,y+5,x1-x0,1,shade(cols[1],-30));
  }
  function flag(x,y){
    R(g,x,y,1,10,'#7a5230');
    R(g,x+1,y,6,4,'#e0b23a');
    PX(g,x+2,y+1,'#f5d878');
  }
  function smoke(x,y){
    R(g,x-1,y-4,4,3,'rgba(240,240,240,.55)');
    R(g,x+2,y-8,5,3,'rgba(240,240,240,.38)');
  }

  if(tpl==='gable' || tpl==='hip'){
    var roofH = Math.max(7, Math.round(H*(o.roofH||0.36)));
    var wt = roofH + 1;
    box(2, wt, W-2, H-1);
    if(o.plank!==false) planks(2, wt, W-2, H-1);
    // 屋顶
    for(var y=0;y<roofH;y++){
      var inset = Math.round((1 - y/roofH) * (W*0.26));
      var col = (y%4===0) ? roofL : roof;
      R(g, 1+inset, y, W-2-inset*2, 1, col);
    }
    R(g, 1, roofH, W-2, 2, roofD);
    R(g, 0, roofH+1, W, 1, shade(roofD,-14));
    if(o.chimney) chimney(W-12, Math.round(roofH*0.35));
    if(o.smoke) smoke(W-10, Math.round(roofH*0.2));
    // 门 + 窗
    var dw = W>=44 ? 9 : (W>=28 ? 7 : 5);
    door(Math.round((W-dw)/2), H-2-dw, dw, dw+1);
    if(W>=28){
      win(4, wt+4, 6, 6);
      win(W-10, wt+4, 6, 6);
    }
    if(W>=44){ win(Math.round(W/2)-3, wt+4, 6, 6); }
    if(o.awning) awning(3, W-3, wt-1);
    if(o.sign){
      R(g, Math.round(W/2)-8, wt+2, 16, 6, '#f0e2c0');
      R(g, Math.round(W/2)-7, wt+3, 14, 4, '#8a5a34');
    }
    if(o.flag) flag(W-8, 0);
  }
  else if(tpl==='flat'){
    var wt2 = Math.max(5, Math.round(H*0.24));
    box(2, wt2, W-2, H-1);
    planks(2, wt2, W-2, H-1);
    R(g, 1, wt2-3, W-2, 3, shade(roof,-6));
    R(g, 1, wt2-4, W-2, 1, roofL);
    for(var wx=5; wx<W-7; wx+=11){
      win(wx, wt2+4, 6, 6);
      if(H>40) win(wx, wt2+14, 6, 6);
    }
    door(Math.round(W/2)-4, H-10, 8, 9);
    if(o.chimney){ R(g, W-12, 1, 6, wt2-2, '#8d8d8d'); R(g, W-13, 0, 8, 2, '#5f5f5f'); if(o.smoke) smoke(W-10,-1); }
    if(o.pipe){ R(g, W-8, wt2-1, 2, 6, '#9aa0a6'); R(g, W-9, wt2+5, 4, 2, '#9aa0a6'); }
    if(o.awning) awning(3, W-3, wt2-1);
  }
  else if(tpl==='silo'){
    var rw = Math.round(W*0.62);
    var x0 = Math.round((W-rw)/2);
    R(g, x0, 4, rw, H-6, wall);
    R(g, x0, 4, 2, H-6, wallD);
    R(g, x0+rw-2, 4, 2, H-6, wallD);
    R(g, x0, 4, rw, 2, wallL);
    for(var by=8; by<H-4; by+=7) R(g, x0, by, rw, 1, shade(wall,-20));
    // 圆顶
    var cy = 4, rr2 = rw/2;
    for(var dy=-4; dy<=0; dy++){
      var half = Math.round(rr2 * Math.sqrt(Math.max(0,1-(dy/4)*(dy/4))));
      R(g, Math.round(W/2)-half, cy+dy, half*2, 1, dy<0?roof:roofD);
    }
    R(g, Math.round(W/2)-1, 0, 2, 1, roofL);
    if(o.win2){ R(g, Math.round(W/2)-3, H-10, 6, 5, '#8fd0e8'); R(g, Math.round(W/2)-3, H-10, 6, 1, '#c8eeff'); }
  }
  else if(tpl==='cone'){
    var tw = Math.round(W*0.56), tx = Math.round((W-tw)/2);
    box(tx, Math.round(H*0.42), tx+tw, H-1);
    if(o.win2){ win(tx+Math.round(tw/2)-3, Math.round(H*0.5), 6, 6); }
    door(tx+Math.round(tw/2)-3, H-9, 6, 8);
    var top = Math.round(H*0.42), coneH = top;
    for(var cy2=0; cy2<coneH; cy2++){
      var ins = Math.round((1 - cy2/coneH) * (tw*0.52));
      R(g, tx+ins, cy2, tw-ins*2, 1, cy2%3===0?roofL:roof);
    }
    R(g, tx-1, coneH, tw+2, 2, roofD);
    if(o.flag) flag(Math.round(W/2), 0);
  }
  else if(tpl==='glass'){
    var gh = Math.max(6, Math.round(H*0.30));
    R(g, 2, gh, W-4, H-gh-1, '#bfeef8');
    for(var px2=2; px2<W-2; px2+=7) R(g, px2, gh, 1, H-gh-1, '#eef8fc');
    for(var py=gh; py<H-2; py+=6) R(g, 2, py, W-4, 1, '#eef8fc');
    for(var ry=0; ry<gh; ry++){
      var ins2 = Math.round((1-ry/gh)*(W*0.10));
      R(g, 1+ins2, ry, W-2-ins2*2, 1, ry%2?'#d8f4fc':'#bfeef8');
      R(g, 1+ins2, ry, 1, 1, '#eef8fc');
    }
    R(g, 1, gh, W-2, 1, '#8fd0e8');
    R(g, 2, H-6, W-4, 4, '#c8b48c');
    door(Math.round(W/2)-4, H-10, 8, 9, '#9aa0a6');
    R(g, 2, H-1, W-4, 1, 'rgba(0,0,0,.2)');
  }
  else if(tpl==='windmill'){
    var mw = Math.round(W*0.34), mx = Math.round((W-mw)/2);
    box(mx, Math.round(H*0.34), mx+mw, H-1);
    door(mx+Math.round(mw/2)-3, H-9, 6, 8);
    var mtop = Math.round(H*0.34), conH = mtop;
    for(var cy3=0; cy3<conH; cy3++){
      var ins3 = Math.round((1-cy3/conH)*(mw*0.5));
      R(g, mx+ins3, cy3, mw-ins3*2, 1, cy3%3===0?roofL:roof);
    }
    // 风车叶片
    var hx = Math.round(W/2), hy = Math.round(H*0.22);
    R(g, hx-1, hy-1, 3, 3, '#5f4a2c');
    for(var a2=0; a2<4; a2++){
      var ang = a2*Math.PI/2 + 0.4;
      for(var li=4; li<Math.round(W*0.34); li++){
        var lx = hx + Math.cos(ang)*li, ly = hy + Math.sin(ang)*li;
        R(g, Math.round(lx), Math.round(ly), 2, 2, '#e8e0cc');
        if(li%5===0) R(g, Math.round(lx), Math.round(ly), 3, 1, '#c8b894');
      }
    }
  }
  else if(tpl==='open'){
    // 亭子/桥：柱子 + 顶
    var postTop = Math.round(H*0.42);
    R(g, 3, postTop, 2, H-postTop-1, '#8a6238');
    R(g, W-5, postTop, 2, H-postTop-1, '#8a6238');
    if(W>40){ R(g, Math.round(W/2)-1, postTop, 2, H-postTop-1, '#8a6238'); }
    for(var ry2=0; ry2<postTop; ry2++){
      var ins4 = Math.round((1-ry2/postTop)*(W*0.22));
      R(g, 1+ins4, ry2, W-2-ins4*2, 1, ry2%4===0?roofL:roof);
    }
    R(g, 0, postTop, W, 2, roofD);
    R(g, 4, H-8, W-8, 3, '#c8b48c');
    R(g, 4, H-8, W-8, 1, '#e0cfa8');
    if(o.bench){ R(g, 5, H-11, W-10, 2, '#b98a4e'); }
  }
  else if(tpl==='bridge'){
    for(var bx=0; bx<W; bx+=4) R(g, bx, Math.round(H*0.35), 3, H-Math.round(H*0.35)-3, '#b98a4e');
    R(g, 0, Math.round(H*0.35), W, 2, '#d9a868');
    R(g, 0, H-4, W, 2, '#8a6238');
    R(g, 0, Math.round(H*0.2), W, 2, '#8a6238');
    R(g, 2, Math.round(H*0.2), 2, Math.round(H*0.8), '#8a6238');
    R(g, W-4, Math.round(H*0.2), 2, Math.round(H*0.8), '#8a6238');
  }
  else if(tpl==='dock'){
    for(var dx=2; dx<W-2; dx+=5) R(g, dx, 3, 4, H-5, '#c9a26a');
    R(g, 0, 1, W, 2, '#8a6238');
    for(var pz=0; pz<3; pz++){ R(g, 3, 6+pz*Math.round((H-10)/3), 2, 3, '#6a4a2c'); R(g, W-5, 6+pz*Math.round((H-10)/3), 2, 3, '#6a4a2c'); }
  }
  else if(tpl==='fountain'){
    var cx2 = W/2, cy4 = H/2;
    g.fillStyle = '#b8b0a0';
    g.beginPath(); g.ellipse(cx2, cy4, W*0.44, H*0.36, 0, 0, 6.284); g.fill();
    g.fillStyle = '#9aa0a6';
    g.beginPath(); g.ellipse(cx2, cy4-1, W*0.40, H*0.32, 0, 0, 6.284); g.fill();
    g.fillStyle = '#6fc8e8';
    g.beginPath(); g.ellipse(cx2, cy4-1, W*0.33, H*0.26, 0, 0, 6.284); g.fill();
    g.fillStyle = 'rgba(255,255,255,.55)';
    g.beginPath(); g.ellipse(cx2, cy4-2, W*0.22, H*0.16, 0, 0, 6.284); g.fill();
    R(g, Math.round(cx2)-2, Math.round(cy4)-10, 4, 10, '#c8c8c0');
    R(g, Math.round(cx2)-3, Math.round(cy4)-12, 6, 2, '#e0e0d8');
    R(g, Math.round(cx2)-1, Math.round(cy4)-14, 2, 3, '#eaf8ff');
  }
  else if(tpl==='statue'){
    R(g, 3, H-6, W-6, 5, '#b0a894');
    R(g, 4, H-7, W-8, 1, '#d0c8b4');
    R(g, 3, H-6, W-6, 1, '#8f8878');
    var sx = Math.round(W/2);
    R(g, sx-3, H-16, 6, 10, '#d8d8d0');         // 身子
    R(g, sx-2, H-20, 4, 4, '#e8e8e0');          // 头
    R(g, sx-4, H-15, 8, 2, '#c0c0b8');          // 手臂
    R(g, sx-2, H-22, 4, 2, '#b8b8b0');
    R(g, sx-3, H-18, 1, 1, '#8a8a80'); R(g, sx+2, H-18, 1, 1, '#8a8a80');
  }
  else if(tpl==='fire'){
    R(g, 2, H-6, W-4, 4, '#6a4a2c');
    R(g, 3, H-8, W-6, 3, '#8a6238');
    R(g, Math.round(W/2)-4, H-14, 8, 8, '#e8722a');
    R(g, Math.round(W/2)-2, H-12, 4, 6, '#ffbf4d');
    R(g, Math.round(W/2)-1, H-10, 2, 4, '#fff0b0');
    PX(g, Math.round(W/2)-4, H-16, '#ff9a3a');
    PX(g, Math.round(W/2)+2, H-17, '#ff9a3a');
  }
  else if(tpl==='prop'){
    // 木桶 / 木箱 / 干草
    var kind = o.prop || 'barrel';
    if(kind==='barrel'){
      R(g, 3, 3, W-6, H-5, '#a8763f');
      R(g, 3, 3, W-6, 2, '#c89458');
      R(g, 3, 7, W-6, 1, '#7a5228'); R(g, 3, H-6, W-6, 1, '#7a5228');
      R(g, 3, 3, 2, H-5, '#8a5f30'); R(g, W-5, 3, 2, H-5, '#8a5f30');
    } else if(kind==='crate'){
      R(g, 2, 3, W-4, H-4, '#c9a26a');
      R(g, 2, 3, W-4, 2, '#e0c08a');
      R(g, 3, 6, W-6, 1, '#8a6238'); R(g, 3, H-5, W-6, 1, '#8a6238');
      R(g, 3, 6, 1, H-11, '#8a6238'); R(g, W-4, 6, 1, H-11, '#8a6238');
    } else if(kind==='hay'){
      R(g, 1, H-8, W-2, 7, '#d8b84a');
      R(g, 2, H-11, W-4, 4, '#e8c85a');
      R(g, 4, H-13, W-8, 3, '#f0d868');
      for(var hi=0; hi<W; hi+=3) R(g, hi+1, H-9, 1, 8, '#c8a838');
    } else if(kind==='crate2'){
      R(g, 2, H-9, W-4, 8, '#b98a4e'); R(g, 2, H-9, W-4, 2, '#d9a868');
      R(g, 3, H-7, W-6, 1, '#8a6238');
    }
  }
  else if(tpl==='gate'){
    R(g, 2, 3, 3, H-4, '#8a6238');
    R(g, W-5, 3, 3, H-4, '#8a6238');
    for(var gy=4; gy<12; gy+=3) R(g, 5, gy, W-10, 2, '#b98a4e');
    R(g, 0, 1, W, 3, '#c8443a');
    R(g, 0, 3, W, 1, '#8f2f20');
  }
  else if(tpl==='post'){
    var cx3 = Math.round(W/2);
    R(g, cx3-1, Math.round(H*0.42), 2, H-Math.round(H*0.42)-1, '#6a4a2c');
    R(g, cx3-3, H-3, 6, 2, '#8a6238');
    var hd = o.head || 'lamp';
    if(hd==='lamp'){
      R(g, cx3-4, 1, 8, 7, '#3a3a3a');
      R(g, cx3-3, 2, 6, 5, '#ffe9a8');
      R(g, cx3-5, 0, 10, 1, '#2a2a2a');
      R(g, cx3-2, 3, 4, 3, '#fff6c8');
    } else if(hd==='lantern'){
      R(g, cx3-5, 0, 10, 2, '#7a7a70');
      R(g, cx3-4, 2, 8, 6, '#c8c4b8');
      R(g, cx3-3, 3, 6, 4, '#ffe9a8');
      R(g, cx3-5, 8, 10, 2, '#9a9a90');
    } else if(hd==='mail'){
      R(g, cx3-5, 1, 10, 6, '#4a8ac8');
      R(g, cx3-4, 2, 8, 4, '#6aaae8');
      R(g, cx3-6, 0, 12, 2, '#3a6a9a');
      R(g, cx3-1, 3, 2, 2, '#e8f4ff');
    } else if(hd==='bell'){
      for(var bi=0; bi<6; bi++) R(g, cx3-4+Math.floor(bi/2), 1+bi, 8-bi, 1, '#c8a83a');
      R(g, cx3-1, 7, 2, 2, '#8a7a2a');
    } else if(hd==='flag'){
      R(g, cx3, 0, 2, 12, '#8a6238');
      R(g, cx3+2, 0, 7, 5, '#c8443a');
      PX(g, cx3+4, 2, '#f5d878');
    } else if(hd==='pot'){
      R(g, cx3-4, 1, 8, 5, '#c87a5a');
      R(g, cx3-3, 0, 6, 2, '#a85a3a');
      R(g, cx3-5, 1, 2, 3, '#5aa84a');
      R(g, cx3+3, 2, 2, 3, '#5aa84a');
    }
  }
  else if(tpl==='wall'){
    var wy0 = Math.round(H*0.30);
    R(g, 0, wy0, W, H-wy0, '#b4b0a2');
    R(g, 0, wy0, W, 2, '#c8c4b4');
    R(g, 0, H-2, W, 2, '#8f8b7e');
    for(var y3=wy0+3; y3<H-2; y3+=4) R(g, 0, y3, W, 1, '#9a968a');
    for(var x3=((W>20)?6:4); x3<W; x3+=7) R(g, x3, wy0+1, 1, H-wy0-2, '#9a968a');
  }
  else if(tpl==='bench'){
    R(g, 1, H-9, W-2, 2, '#b98a4e');
    R(g, 1, H-11, W-2, 1, '#d9a868');
    R(g, 1, H-6, W-2, 2, '#b98a4e');
    R(g, 1, H-6, W-2, 1, '#d9a868');
    R(g, 2, H-4, 2, 4, '#8a6238');
    R(g, W-4, H-4, 2, 4, '#8a6238');
  }
  else if(tpl==='swing'){
    R(g, 2, 1, 2, H-3, '#8a6238');
    R(g, W-4, 1, 2, H-3, '#8a6238');
    R(g, 2, 0, W-4, 2, '#a8763f');
    R(g, Math.round(W/2)-7, 9, 2, 8, '#c8b894');
    R(g, Math.round(W/2)+5, 9, 2, 8, '#c8b894');
    R(g, Math.round(W/2)-7, 16, 14, 3, '#b98a4e');
    R(g, Math.round(W/2)-7, 16, 14, 1, '#d9a868');
  }
  else if(tpl==='tent'){
    for(var ty=0; ty<H-2; ty++){
      var ti = Math.round((1-ty/(H-2))*(W*0.42));
      R(g, ti, ty+1, W-ti*2, 1, ty%4===0 ? roofL : roof);
    }
    R(g, Math.round(W/2)-3, H-9, 6, 8, shade(roof,-50));
    R(g, Math.round(W/2)-3, H-9, 6, 1, shade(roof,-20));
    R(g, 2, H-2, W-4, 2, shade(roof,-60));
  }
  else if(tpl==='arch'){
    var px3 = Math.round(W*0.12), pw = Math.max(3, Math.round(W*0.10));
    R(g, px3, Math.round(H*0.35), pw, H-Math.round(H*0.35)-2, '#8a6238');
    R(g, W-px3-pw, Math.round(H*0.35), pw, H-Math.round(H*0.35)-2, '#8a6238');
    for(var ay=0; ay<Math.round(H*0.40); ay++){
      var ai = Math.round((1-ay/Math.round(H*0.40))*(W*0.10));
      R(g, px3-ai, ay+1, W-px3*2+ai*2, 1, ay%3===0 ? roofL : roof);
    }
    R(g, px3-1, Math.round(H*0.33), pw+2, 2, shade(roof,-40));
    R(g, W-px3-pw-1, Math.round(H*0.33), pw+2, 2, shade(roof,-40));
    if(o.vine){
      for(var vi=0; vi<5; vi++) PX(g, px3+pw+vi*3, Math.round(H*0.45)+vi*2, '#5aa84a');
    }
  }
  else {
    box(2, 3, W-2, H-1);
  }

  // 通用：底部接触影（比全局投影更贴地）
  R(g, 2, H-2, W-4, 2, 'rgba(0,0,0,.18)');
  return c;
}

/* =========================================================================
   产出物图标（16×16）
   ========================================================================= */
function sprGood(kind, col){
  var c = CV(16,16), g = c.getContext('2d');
  col = col || '#e8b23a';
  var d = shade(col, -40), l = shade(col, 30);
  if(kind==='jar'){
    R(g,4,4,8,10,'#c8ccd0'); R(g,5,5,6,8,col);
    R(g,5,5,6,1,l); R(g,3,2,10,3,'#8a5a34'); R(g,4,1,8,1,'#a8763f');
    R(g,6,7,1,4,'rgba(255,255,255,.5)');
  } else if(kind==='bottle'){
    R(g,6,1,4,3,'#dfe8ee'); R(g,5,4,6,10,'#e8f0f6'); R(g,6,5,4,8,col);
    R(g,5,4,6,1,'#ffffff'); R(g,5,12,6,2,d);
  } else if(kind==='loaf'){
    R(g,2,6,12,7,col); R(g,3,5,10,2,l);
    R(g,4,7,2,1,d); R(g,8,7,2,1,d); R(g,6,9,2,1,d); R(g,10,9,1,1,d);
    R(g,2,12,12,1,d);
  } else if(kind==='wheel'){
    R(g,2,4,12,9,col); R(g,3,5,10,7,l);
    R(g,4,8,3,3,d); R(g,9,8,3,3,d); R(g,2,12,12,1,d);
    PX(g,6,6,'#ffffff'); PX(g,11,10,'#ffffff');
  } else if(kind==='ball'){
    R(g,3,3,10,10,col); R(g,4,4,8,8,l);
    R(g,5,5,2,2,d); R(g,8,8,2,2,d); R(g,9,5,2,2,d);
  } else if(kind==='fish'){
    R(g,3,6,9,5,col); R(g,2,7,2,3,d);
    R(g,12,5,3,7,d); R(g,12,5,1,7,col);
    PX(g,4,7,'#ffffff'); PX(g,4,7,'#1a1a1a');
  } else if(kind==='mush'){
    R(g,3,3,10,6,col); R(g,4,2,8,2,l);
    R(g,6,9,4,5,'#f0e6d0'); R(g,6,9,4,1,'#d8ccb4');
    PX(g,5,5,'#ffffff'); PX(g,9,6,'#ffffff'); PX(g,7,4,'#ffffff');
  } else if(kind==='bunch'){
    R(g,7,9,2,5,'#5a8a3a');
    R(g,5,5,4,4,col); R(g,8,4,4,4,l); R(g,3,7,4,4,shade(col,10));
    PX(g,6,6,'#ffe9a8'); PX(g,9,5,'#fff4c8'); PX(g,4,8,'#ffe9a8');
  } else if(kind==='sack'){
    R(g,3,5,10,9,'#e0d0b0'); R(g,4,4,8,2,'#c8b894');
    R(g,6,2,4,3,'#b8a07a'); R(g,5,8,6,2,'#a89070'); R(g,7,8,2,2,'#8a6a40');
  } else if(kind==='plank'){
    R(g,1,5,14,3,'#c9a26a'); R(g,1,5,14,1,'#e0c08a');
    R(g,1,9,14,3,'#b98a4e'); R(g,1,9,14,1,'#d9a868');
    PX(g,3,6,'#8a6238'); PX(g,11,10,'#8a6238');
  } else if(kind==='truffle'){
    R(g,3,4,10,9,'#4a3a30'); R(g,4,5,8,7,d);
    PX(g,6,6,'#6a5a48'); PX(g,9,8,'#6a5a48'); PX(g,5,10,'#3a2a20');
  } else if(kind==='leaf'){
    R(g,4,3,8,11,'#5aa84a'); R(g,5,4,6,9,'#7ac85a');
    R(g,7,3,2,11,'#3a8a2a'); R(g,4,3,8,1,'#8ad86a');
    R(g,3,12,10,2,'#4a8a3a');
  } else {
    R(g,4,4,8,8,col); R(g,5,5,6,6,l);
  }
  return c;
}
