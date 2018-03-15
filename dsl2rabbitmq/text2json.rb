require 'bunny'

lines = File.open(ARGV[0], "r").readlines

class Q
  def initialize
    @conn = Bunny.new(:automatically_recover => false)
    @conn.start
    @ch = @conn.create_channel
    @q = @ch.queue("testQueue")
  end
    
  def send(message) 
    msg = message.gsub("'","\"")
    @ch.default_exchange.publish(msg, :routing_key => @q.name)
  end

  def done()
    @conn.close()
  end

end


class EntityCreator
  def initialize()
  end

  def entityInfo(v1, v2)
    entityType = (v1[-1] == ",") ? v1[0..-2] : v1
    entityName = (v2 == nil) ? (entityType[0].downcase() + entityType[1..-1]) : ((v2[-1] == ",") ? v2[0..-2] : v2)
    return entityType, entityName, ((v1[-1] == ",") || (v2 == nil)) ? 1 : 2
  end

  def entityListBreakdown(v1, v2)
    entityType,entityName,offset = entityInfo(v1, v2)
    return entityType,entityName.split("/"),offset
  end
end

def extractDuration(s)
  return s.split(":")[1]
end

entityCreator = EntityCreator.new()
valueSetting = '** BUG, SHOULD NOT SEE THIS **'
originalDestinationEntityType,originalDestinationEntityName = '** BUG **', '** BUG **'
outQ = Q.new();

lines.each do |line|
  line.chomp!
  line.strip!
  if ((line.length == 0) || (line[0] == "#")) then
    next
  end
  data = line.split
  msg = nil
  if ((line.length > 0) && (line[0] != '"')) then
    if (data[0] == "echo") then
      messageText = data[1]
    else
      messageText = line
    end
    outQ.send("{'command':'echo','message':'#{messageText}'}")
  end
  if (data[0] == "entities") then
    scan = 1
    while (scan < data.length) do
      entityType,entityNames,offset = entityCreator.entityListBreakdown(data[scan], data[scan+1])
      entityNames.each do |entityName|
        outQ.send("{'command':'create','entityType':'#{entityType}','entityName':'#{entityName}'}")
      end
      scan += offset
    end
  elsif ((data[0] == "using") || (data[0] == "disable")) then
    outQ.send("{'command':'#{data[0]}','featureName':'#{data[1]}'}")
  elsif (data[0] == "clock") then
    outQ.send("{'command':'clock','tickDuration':'#{data[2]}'}")
  elsif ((data[0] == "tick") || (data[0] == "tick*")) then
    outQ.send("{'command':'#{data[0]}'}")
  elsif ((data.length > 3) && (data[2] == "time")) then
    outQ.send("{'command':'register','entityType':'#{data[0]}','entityName':'#{data[1]}','time':'#{data[3]}'}")
  elsif ((data.length > 3) && (data[0] == "verify")) then
    outQ.send("{'command':'verify','keyName':'#{data[1]}', 'entityType':'#{data[2]}','entityName':'#{data[3]}','expectedValue':'#{data[4]}'}")
  elsif (data[0] == "X") then
    outQ.send("{'command':'exit'}")
  elsif ((data.length == 7) && (data[2] == "set")) then
    fromEntityType,fromEntityName = entityCreator.entityInfo(data[0], data[1])
    toEntityType,toEntityName = entityCreator.entityInfo(data[5],data[6])
    originalDestinationEntityType,originalDestinationEntityName = toEntityType,toEntityName
    valueSetting = "#{data[3]}"
    outQ.send("{'command':'set','from':{'entityType':'#{fromEntityType}','entityName':'#{fromEntityName}'},'to':{'entityType':'#{toEntityType}','entityName':'#{toEntityName}'},'value':'#{valueSetting}'}")
  elsif (data[0] == "replicate") then
    toEntityType,toEntityName = entityCreator.entityInfo(data[2],data[3])
    command_executing_in_future = "{'command':'set','from':{'entityType':'#{originalDestinationEntityType}','entityName':'#{originalDestinationEntityName}'},'to':{'entityType':'#{toEntityType}','entityName':'#{toEntityName}'},'value':'#{valueSetting}'}"
    outQ.send("{'command':'delay','duration':#{extractDuration(data[1])},'command_executing_in_future':#{command_executing_in_future} }")
  elsif (data[0] == "invariant") then
    checking = data[4..-1].join(' ')
    outQ.send("{'command':'invariant','type':'#{data[1]}','checkPoint':'#{data[2]} #{data[3]}','checking':'#{checking}'}")
  elsif (data[0] == "\"\"") then
    text = data[1..-1].join(' ')
    outQ.send("{'command':'group','message':'#{text}'}")
  elsif (data[0] != "echo") then
    print "*** DROPPING COMMENT *** #{line}\n"
  end
end

