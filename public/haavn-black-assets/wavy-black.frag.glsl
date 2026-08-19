precision highp float;
uniform vec2 uRes; uniform float uT;

float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){
  vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){float a=.5,s=0.;for(int k=0;k<4;k++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}

float nodeH(vec2 i,float t){
  float a=hash(i)*6.2831, b=hash(i+7.13)*6.2831, c=hash(i+3.77);
  return sin(a+t*(.34+c*.42))*.62 + sin(b+t*.21)*.42;
}

/* flat-shaded triangle of a simplex lattice -> hard low-poly facets */
vec3 lowpoly(vec2 p,float t,float amp){
  const float F=0.3660254, G=0.2113249;
  float s=(p.x+p.y)*F;
  vec2 i=floor(p+s);
  float tt=(i.x+i.y)*G;
  vec2 P0=i-tt, x0=p-P0;
  vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);
  vec2 I1=i+i1, I2=i+1.;
  vec2 P1=I1-(I1.x+I1.y)*G, P2=I2-(I2.x+I2.y)*G;
  float h0=nodeH(i,t)*amp,h1=nodeH(I1,t)*amp,h2=nodeH(I2,t)*amp;
  vec3 n=normalize(cross(vec3(P1-P0,h1-h0),vec3(P2-P0,h2-h0)));
  if(n.z<0.)n=-n;
  return n;
}

void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float t=uT;

  float ang=t*0.007;
  mat2 R=mat2(cos(ang),sin(ang),-sin(ang),cos(ang));
  vec2 q=R*(uv*vec2(8.2,12.6))+vec2(t*0.13,t*0.06);

  vec2 w1=vec2(fbm(q*0.30+t*0.026), fbm(q*0.30+19.7-t*0.021));
  q+=2.6*(w1-0.5)*vec2(1.0,0.55);
  vec2 w2=vec2(fbm(q*0.95-t*0.04), fbm(q*0.95+7.1+t*0.032));
  q+=0.8*(w2-0.5);

  vec3 n1=lowpoly(q,t,0.95);
  vec3 n2=lowpoly(q*2.3+13.0,t*1.15,0.44);
  vec3 n3=lowpoly(q*5.3-27.0,t*1.6,0.20);
  vec3 n4=lowpoly(q*11.7+61.0,t*2.1,0.09);
  vec3 n=normalize(n1+n2*0.70+n3*0.46+n4*0.28);

  vec3 L=normalize(vec3(-0.38,0.56,0.74));
  vec3 V=vec3(0.,0.,1.);
  float d=max(dot(n,L),0.);
  float spec=pow(max(dot(normalize(L+V),n),0.),70.);
  float spec2=pow(max(dot(normalize(L+V),n),0.),16.);

  float shade=pow(d,3.0)*0.62+pow(d,1.1)*0.05+spec*0.75+spec2*0.10;

  vec2 sd=normalize(n.xy+1e-4);
  float str=fbm(q*30.0+sd*14.0);
  shade*=0.74+0.46*str;

  float mask=fbm(q*0.18+vec2(t*0.016,-t*0.012));
  shade*=smoothstep(0.10,0.82,mask)*0.86+0.14;

  shade=shade/(1.0+shade*0.62);          // soft highlight rolloff
  vec3 col=vec3(clamp(shade,0.,1.));
  col=pow(col,vec3(1.10));
  col=col*0.92+0.042;                    // lift the black floor to match the plate
  col*=vec3(0.985,0.99,1.0);
  gl_FragColor=vec4(col,1.);
}
