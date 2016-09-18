var audio=require('services/audio')
var wav=require('parsers/wav')

module.exports=require('base/drawapp').extend({
	tools:{
		Slider:require('tools/slider').extend({
			Bg:{moveScroll:0},
			Knob:{moveScroll:0},
		}),
		Button:require('tools/button').extend({
			Bg:{moveScroll:0},
			Text:{moveScroll:0},
		}),
		Rect:{
			color:'white',
			borderWidth:1,
			borderColor:'white',
			borderRadius:[0,6,6,0],
		}
	},
	onInit:function(){
		audio.reset()
		this.recording=[]
		this.samples=0
		// ok we dont deal in individual nodes we deal in whole flows.
		this.recFlow=audio.Flow({
			gain1:{
				to:'output',
				gain:.0,
			},
			recorder1:{
				to:'gain1',
				chunk:512,
				onData:function(data){
					this.redraw()
					this.recording.push(data)
					this.samples+=data[0].length
					this.scopeData=data
				}.bind(this)
			},
			input1:{
				to:'recorder1',
				device:'Microphone'
			}
		})
		
		//var out=wav.parse(require('./audio.wav'),true)
		//this.recording.push(out.data)
		//this.samples=out.data[0].length
		
		this.playFlow=audio.Flow({
			buffer1:{
				to:'output',
				rate:44100,
				loop:true,
				start:0
			}
		})
	},
	onScroll:function(e){
		this.redraw()
	},
	zoom:1000.,
	zoomRange:[2,1000],
	zoomScroll:0,
	setZoom:function(z,x){
		var zoom=clamp(z,this.zoomRange[0],this.zoomRange[1])
		var x1=x*this.zoom
		var x2=x*zoom
		this.zoom=zoom
		this.zoomScroll=(x1-x2)/zoom
		this.redraw()
	},
	onFingerWheel:function(e){
		var z=ceil(this.zoom*(1+e.yWheel/1500))
		this.setZoom(z,e.x)
	},
	onDraw:function(){
		this.scrollDeltaSet(this.zoomScroll,0,1)
		this.zoomScroll=0
		this.drawButton({
			text:this.recFlow.running?"Stop":"Rec",
			onClick:function(){
				if(this.recFlow.running)this.recFlow.stop()
				else {
					this.recording.length=0
					this.samples=0
					this.recFlow.start()
				}
				this.redraw()
			}.bind(this)
		})
		this.drawButton({
			text:this.playFlow.running?"Stop":"Play",
			onClick:function(){
				if(this.playFlow.running){
					this.playFlow.stop()
					this.redraw()
					return
				}
				// lets combine all the recording buffers
				var out=new Float32Array(this.samples)
				var o=0
				for(var c=0;c<this.recording.length;c++){
					var left=this.recording[c][0]
					for(var i=0;i<left.length;i++)out[o++]=left[i]
				}
				
				this.playFlow.start({
					buffer1:{
						data:[out,out]
					}
				})
				this.redraw()
			}.bind(this)
		})
		
		this.drawSlider({
			onValue:function(e){
				this.setZoom(e.value,this.todo.xScroll)
				this.redraw()
			}.bind(this),
			vertical:false,
			handleSize:30,
			value:this.zoom,
			step:1,
			range:this.zoomRange,
			w:100,
			h:36
		})
		
		// lets draw the recording
		if(this.recording){
			
			var scale=this.zoom
			var t=0
			var minv=0,maxv=0.
			// we should draw it near the scroll position
			var xmin=this.todo.xScroll-this.$w
			var xmax=xmin+this.$w*3
			var dc=0
			outer:
			for(var c=0;c<this.recording.length;c++){
				var left=this.recording[c][0]
				if((t+left.length)/scale<xmin){
					t+=left.length
					continue
				}
				for(var i=0;i<left.length;i++){
					var v=left[i]
					if(v<minv)minv=v
					if(v>maxv)maxv=v
					if(!(t++%scale)&&t/scale>xmin){
						this.drawRect({
							x:t/scale,
							y:minv*100+300,
							w:2,//t / scale,
							h:(maxv-minv)*100+1.//+300
						})
						minv=0
						maxv=0
					}
					if(t/scale>xmax)break outer
				}
			}
			this.scrollSize(this.samples/scale,0)
		}
		// lets draw the scope 
		if(this.scopeData){
			var left=this.scopeData[0]
			this.drawLine({sx:0,sy:100})
			for(var i=0;i<left.length;i++){
				this.drawLine({
					x:i,
					y:left[i]*100+100
				})
			}
		}
	}
})